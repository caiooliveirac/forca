# Galgenspiel — Guia de Deploy

## Arquitetura de Produção

Há dois modelos de deploy, dependendo de como o Nginx está configurado no servidor:

### Modelo A: Nginx no host

```
Internet → Nginx (host) → /forca/     → arquivos estáticos (frontend/dist)
                        → /forca/api/ → 127.0.0.1:3077 → container backend
                                                         → container db (rede interna)
```

- O **frontend** é servido como HTML/CSS/JS estático pelo Nginx do host
- O **backend** roda em Docker, exposto **apenas em 127.0.0.1** (inacessível de fora)
- O **PostgreSQL** roda em Docker sem portas expostas (rede interna Docker)
- O Nginx do host faz reverse proxy de `/forca/api/` para o backend

### Modelo B: Nginx em Docker (rede compartilhada)

```
Internet → Cloudflare → Nginx (container, ex: repo-nginx-1)
                          → /forca/     → forca-frontend:80  (container)
                          → /forca/api/ → forca-backend:3001 (container)
                                          → forca-db (rede interna)
```

- O **frontend** roda como container Nginx servindo os arquivos estáticos
- O **backend** e o **frontend** se conectam a uma rede Docker compartilhada
  com o container Nginx principal (ex: `perguntas_default`)
- O Nginx principal resolve `forca-frontend` e `forca-backend` via DNS Docker
- Usa o override: `docker-compose.prod.override.docker-nginx.yml`

---

## Dev vs Prod — Qual compose usar

| Ambiente | Comando | O que faz |
|----------|---------|-----------|
| Dev | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` | DB + backend (hot reload) + frontend (Vite dev server) |
| Prod (nginx host) | `docker compose -f docker-compose.prod.yml up -d --build` | DB + backend + frontend build. Copiar estáticos para nginx. |
| Prod (nginx Docker) | `docker compose -f docker-compose.prod.yml -f docker-compose.prod.override.docker-nginx.yml up -d --build` | DB + backend + frontend. Nginx acessa via rede Docker. |

---

## Passo 0: Reconhecimento do Servidor

**FAZER ANTES DE QUALQUER MUDANÇA.**

```bash
# Config do nginx
cat /etc/nginx/nginx.conf
ls /etc/nginx/conf.d/
ls /etc/nginx/sites-enabled/     # se existir

# Portas já ocupadas
sudo ss -tlnp | grep -E ':(80|443|3[0-9]{3}|8[0-9]{3})\s'

# Containers já rodando
docker ps --format "table {{.Names}}\t{{.Ports}}"

# Redes docker
docker network ls
```

Anotar:
1. Em qual arquivo está o server block que escuta 443/80
2. Quais portas já estão ocupadas
3. Se usa `conf.d/` ou `sites-enabled/` ou ambos
4. Verificar que porta 3077 está livre (ou escolher outra)

---

## Passo 1: Clonar e Configurar

```bash
# Clonar o repositório
sudo mkdir -p /opt/galgenspiel
cd /opt/galgenspiel
git clone <URL_DO_REPO> .

# Criar .env de produção
cp .env.example .env
```

Editar `.env` com senhas fortes:
```bash
# Gerar senhas — IMPORTANTE: usar hex para DB_PASSWORD (URL-safe)
openssl rand -hex 24     # → DB_PASSWORD (sem /, +, = que quebram DATABASE_URL)
openssl rand -base64 48  # → JWT_SECRET (qualquer char é OK aqui)
```

```dotenv
DB_NAME=galgenspiel
DB_USER=galgen
DB_PASSWORD=<senha-hex-gerada>
JWT_SECRET=<outra-senha-gerada>
CORS_ORIGIN=https://seudominio.com
BACKEND_PORT=3077
```

---

## Passo 2: Build do Frontend

### Modelo A (nginx no host):
```bash
cd /opt/galgenspiel/frontend
npm ci --production=false
VITE_API_URL=/forca VITE_BASE=/forca/ npm run build
```

> **Importante:** `VITE_API_URL=/forca` define o prefixo das chamadas API.
> As rotas do frontend usam `/api/auth/...`, `/api/game/...` que se concatenam
> ao baseURL, gerando `/forca/api/auth/...` etc.
> `VITE_BASE=/forca/` configura o base path do Vite para assets.

Copiar para diretório servido pelo Nginx:
```bash
sudo mkdir -p /var/www/galgenspiel
sudo cp -r dist/* /var/www/galgenspiel/
```

### Modelo B (nginx em Docker):
O build é feito automaticamente pelo Docker Compose (args no Dockerfile).
Não é necessário copiar arquivos — o container `forca-frontend` serve diretamente.

---

## Passo 3: Configurar Nginx

Escolha a opção que se aplica ao seu servidor. Os arquivos de configuração
prontos estão em `nginx/`.

### Opção A: Servidor com `conf.d/` incluído em server block existente

```bash
sudo cp nginx/galgenspiel-location.conf /etc/nginx/conf.d/
```

> Se a porta não for 3077, editar o arquivo antes de copiar.

### Opção B: Servidor com `sites-available/` + `sites-enabled/`

Copiar os `location` blocks de `nginx/galgenspiel-location.conf`
para dentro do server block existente (o arquivo identificado no Passo 0).

### Opção C: Subdomínio dedicado (`forca.seudominio.com`)

```bash
sudo cp nginx/galgenspiel-subdomain.conf /etc/nginx/sites-available/galgenspiel
sudo ln -s /etc/nginx/sites-available/galgenspiel /etc/nginx/sites-enabled/
# Editar server_name para o domínio real
# Depois: sudo certbot --nginx -d forca.seudominio.com
```

Testar e recarregar:
```bash
sudo nginx -t && sudo nginx -s reload
```

### Opção D: Nginx rodando em Docker (rede compartilhada)

Quando o Nginx principal já é um container Docker (ex: `repo-nginx-1`), use
o override para conectar backend e frontend à mesma rede:

1. Adicionar upstreams e location blocks na config do Nginx principal:
```nginx
# No bloco http (ou arquivo de upstreams):
upstream app_forca_frontend {
    server forca-frontend:80;
    keepalive 32;
}

upstream app_forca_backend {
    server forca-backend:3001;
    keepalive 32;
}

# No server block HTTPS:
location = /forca {
    return 301 /forca/;
}

location /forca/api/ {
    rewrite ^/forca/api/?(.*)$ /api/$1 break;
    proxy_pass http://app_forca_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
    proxy_redirect off;
}

location /forca/ {
    rewrite ^/forca/(.*)$ /$1 break;
    proxy_pass http://app_forca_frontend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    proxy_redirect off;
}
```

2. Conectar o Nginx principal à rede compartilhada (se ainda não estiver).

3. Testar e recarregar o Nginx dentro do container:
```bash
docker exec <nginx-container> nginx -t && docker exec <nginx-container> nginx -s reload
```

---

## Passo 4: Subir os Containers

### Modelo A (nginx no host):
```bash
cd /opt/galgenspiel
docker compose -f docker-compose.prod.yml up -d --build
```

### Modelo B (nginx em Docker):
```bash
cd /opt/galgenspiel
docker compose -f docker-compose.prod.yml \
               -f docker-compose.prod.override.docker-nginx.yml \
               up -d --build
```

Verificar:
```bash
docker compose -f docker-compose.prod.yml ps
curl http://127.0.0.1:3077/api/health
```

---

## Passo 5: Deploy Automatizado

Após o primeiro deploy, usar o script:

```bash
chmod +x deploy.sh
./deploy.sh           # branch main
./deploy.sh develop   # outra branch
```

O script faz: `git pull` → `npm build` → copia estáticos → rebuild containers → health check → nginx reload.

---

## Checklist Pré-Deploy

- [ ] `.env` preenchido com senhas fortes (DB_PASSWORD em **hex**, sem `/+=`)
- [ ] Porta 3077 livre: `ss -tlnp | grep 3077`
- [ ] `/var/www/galgenspiel` criado (modelo A) ou rede compartilhada existe (modelo B)
- [ ] Repo clonado em `/opt/galgenspiel`
- [ ] `nginx -t` passa sem erro
- [ ] Docker e docker compose instalados
- [ ] Nenhum container galgenspiel antigo rodando

## Checklist Pós-Deploy

- [ ] `curl http://127.0.0.1:3077/api/health` → OK
- [ ] `curl https://seudominio.com/forca/` → HTML
- [ ] `curl https://seudominio.com/forca/api/health` → OK
- [ ] Cadastro funciona no navegador
- [ ] Login funciona
- [ ] Jogar uma rodada salva no banco
- [ ] Outros sites/apps do servidor continuam funcionando

---

## O que NÃO fazer

- **NÃO** editar `nginx.conf` principal
- **NÃO** usar `nginx restart` (usar `nginx -t && nginx -s reload`)
- **NÃO** expor a porta do PostgreSQL
- **NÃO** colocar senhas no docker-compose (usar `.env`)
- **NÃO** dar `docker compose down` em containers que não são seus
- **NÃO** usar `docker-compose.yml` em prod (ele expõe DB na 5432)

---

## Estrutura de Arquivos Relevantes

```
galgenspiel/
├── docker-compose.yml                            ← base (dev, expõe portas)
├── docker-compose.dev.yml                        ← override dev (hot reload, Vite)
├── docker-compose.prod.yml                       ← produção base (DB + backend + frontend)
├── docker-compose.prod.override.docker-nginx.yml ← override: nginx em Docker (rede compartilhada)
├── deploy.sh                                     ← script de deploy automatizado
├── .env                                          ← variáveis (não commitar)
├── .env.example                                  ← template de variáveis
├── nginx/
│   ├── galgenspiel-location.conf   ← Opção A/B: location blocks para nginx do host
│   └── galgenspiel-subdomain.conf  ← Opção C: server block para subdomínio
├── db/init.sql
├── backend/
└── frontend/
```
