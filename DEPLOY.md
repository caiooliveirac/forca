# Galgenspiel — Guia de Deploy

## Arquitetura de Produção

```
Internet → Nginx (host) → /forca/     → arquivos estáticos (frontend/dist)
                        → /forca/api/ → 127.0.0.1:3077 → container backend
                                                         → container db (rede interna)
```

- O **frontend** é servido como HTML/CSS/JS estático pelo Nginx do host
- O **backend** roda em Docker, exposto **apenas em 127.0.0.1** (inacessível de fora)
- O **PostgreSQL** roda em Docker sem portas expostas (rede interna Docker)
- O Nginx do host faz reverse proxy de `/forca/api/` para o backend

---

## Dev vs Prod — Qual compose usar

| Ambiente | Comando | O que faz |
|----------|---------|-----------|
| Dev | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` | DB + backend (hot reload) + frontend (Vite dev server) |
| Prod | `docker compose -f docker-compose.prod.yml up -d --build` | DB + backend apenas. Frontend é build estático. |

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
# Gerar senhas
openssl rand -base64 32   # → DB_PASSWORD
openssl rand -base64 48   # → JWT_SECRET
```

```dotenv
DB_NAME=galgenspiel
DB_USER=galgen
DB_PASSWORD=<senha-gerada>
JWT_SECRET=<outra-senha-gerada>
CORS_ORIGIN=https://seudominio.com
BACKEND_PORT=3077
```

---

## Passo 2: Build do Frontend

```bash
cd /opt/galgenspiel/frontend
npm ci --production=false
VITE_API_URL=/forca/api npm run build
```

> **Importante:** `VITE_API_URL=/forca/api` faz com que o frontend use path relativo.
> O Nginx do host resolve `/forca/api/` → `127.0.0.1:3077/api/`.

Copiar para diretório servido pelo Nginx:
```bash
sudo mkdir -p /var/www/galgenspiel
sudo cp -r dist/* /var/www/galgenspiel/
```

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

---

## Passo 4: Subir os Containers

```bash
cd /opt/galgenspiel
docker compose -f docker-compose.prod.yml up -d --build
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

- [ ] `.env` preenchido com senhas fortes
- [ ] Porta 3077 livre: `ss -tlnp | grep 3077`
- [ ] `/var/www/galgenspiel` criado
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
├── docker-compose.yml          ← base (dev, expõe portas)
├── docker-compose.dev.yml      ← override dev (hot reload, Vite)
├── docker-compose.prod.yml     ← produção (rede isolada, 127.0.0.1 only)
├── deploy.sh                   ← script de deploy automatizado
├── .env                        ← variáveis (não commitar)
├── .env.example                ← template de variáveis
├── nginx.conf                  ← nginx do docker-compose.yml (dev com nginx container)
├── nginx/
│   ├── galgenspiel-location.conf   ← Opção A/B: location blocks para nginx do host
│   └── galgenspiel-subdomain.conf  ← Opção C: server block para subdomínio
├── db/init.sql
├── backend/
└── frontend/
```
