# Aponta

Sistema de tickets/helpdesk.

## Arquitetura de Produção e HTTPS (Caddy)

A aplicação foi desenhada para ser hospedada em um VPS que roda múltiplos projetos, usando o **Caddy como servidor web global (Edge Proxy) no host**.

### Portas e Segurança
Os arquivos `docker-compose.yml` e `.env.prod` foram configurados para **nunca exportar portas abertas publicamente no Docker**. O Aponta escuta nas portas internas `127.0.0.1:8090` (Web/Frontend) e `127.0.0.1:8091` (API).

Para liberar a aplicação na porta `443` (HTTPS), o servidor **S.O (Host) precisa de uma gerência Edge Proxy**. Neste projeto, estamos usando um **Caddy Systemd Service** (rodando diretamente no Ubuntu da VPS).

Se você for migrar o projeto para um novo VPS, não esqueça de instalar o Caddy e adicionar o bloco de reverse_proxy para o Aponta.

**Exemplo do trecho no `/etc/caddy/Caddyfile` do servidor:**
```caddyfile
aponta.dmtecnologia.cloud {
    tls email@dominio.com
    reverse_proxy 127.0.0.1:8090
}
```

Desta forma, todo o tráfego da internet (`https://aponta.dmtecnologia.cloud`) chega no Host de forma encriptada, o Caddy desembrulha o SSL e repassa internamente para a porta 8090, onde o `nginx` do Docker interno (rodando o frontend React) o recebe. As chamadas `/api/*` geradas no frontend e atingidas pelo Caddy caem no frontend, sendo em seguida redirecionadas pelo `nginx.conf` da imagem Web para a API real, garantindo total isolamento da rede.

## Comandos

Subir em produção:
```bash
docker compose -p aponta-prod --env-file .env.prod -f docker-compose.yml up -d --build
```
