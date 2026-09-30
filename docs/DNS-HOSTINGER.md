# Apuntar adrgarcia.com a Cloud Run con el DNS de Hostinger

Hostinger sigue siendo el **registrador y el administrador de DNS**. No se cambian nameservers, así que tu correo y los demás registros quedan intactos. En Google solo se crean los *domain mappings* de Cloud Run, que incluyen el certificado HTTPS gratis.

> Requisito: el servicio `adrgarcia-web` ya desplegado (`infra/02-first-deploy.sh`).
> Ejecuta los comandos en Cloud Shell, desde la carpeta del repo.

## Paso 1: Verificar que el dominio es tuyo

```bash
bash infra/04-domain-hostinger.sh verify
```

1. Se abre **Google Search Console** con la cuenta activa de `gcloud` (`gadrian999@gmail.com`). Elige **Proveedor de nombres de dominio → Otro** y copia el valor `google-site-verification=…`.
2. En **hPanel → Dominios → adrgarcia.com → DNS / Nameservers → Registros DNS → Agregar registro**, llena:
   - Tipo: `TXT`
   - Nombre: `@`
   - Valor: `google-site-verification=…`
   - TTL: `300`
3. Espera 5–15 minutos, comprueba con `dig +short TXT adrgarcia.com` y pulsa **Verificar** en Search Console.

Deja ese TXT para siempre. Si lo borras, Google puede desverificar el dominio.

## Paso 2: Crear los mapeos y obtener los registros

```bash
bash infra/04-domain-hostinger.sh map
```

El script crea los mapeos para `adrgarcia.com` y `www.adrgarcia.com`, e imprime la tabla exacta de registros. Normalmente es esta:

| Tipo | Nombre | Valor |
|---|---|---|
| A | @ | 216.239.32.21 |
| A | @ | 216.239.34.21 |
| A | @ | 216.239.36.21 |
| A | @ | 216.239.38.21 |
| AAAA | @ | 2001:4860:4802:32::15 |
| AAAA | @ | 2001:4860:4802:34::15 |
| AAAA | @ | 2001:4860:4802:36::15 |
| AAAA | @ | 2001:4860:4802:38::15 |
| CNAME | www | ghs.googlehosted.com |

Usa siempre la tabla que imprime el script; esta es solo una referencia. Si la necesitas de nuevo: `bash infra/04-domain-hostinger.sh records`.

## Paso 3: Configurar los registros en hPanel

En **hPanel → Dominios → adrgarcia.com → Registros DNS**:

1. **Borra** los registros que Hostinger crea por defecto:
   - `A` con nombre `@` (y `AAAA @` si existe): apuntan al hosting o a la página de estacionamiento de Hostinger.
   - `CNAME` con nombre `www`: apunta a `adrgarcia.com` o a Hostinger.
2. **Agrega** los 4 `A`, los 4 `AAAA` y el `CNAME` de la tabla, con TTL `300`.
3. **No toques** estos registros:
   - `MX`, y los `TXT` de SPF (`v=spf1…`), DKIM y DMARC (`_dmarc`), si usas correo con el dominio.
   - El `TXT` `google-site-verification`.
   - Los registros `NS` y `SOA`.
4. Si Hostinger tiene activado un **CDN o proxy** para el dominio, desactívalo. Cloud Run necesita que el DNS apunte directo a Google para emitir el certificado.

## Paso 4: Esperar el certificado HTTPS

```bash
bash infra/04-domain-hostinger.sh status
```

- El DNS público debe mostrar las IPs `216.239.x.21` y `ghs.googlehosted.com`.
- Cuando los dos dominios aparezcan con `Ready = True`, el certificado ya está emitido. Suele tardar unos 15 minutos y puede llegar a 24 h.

Prueba final:

```bash
curl -sI https://adrgarcia.com | head -3                  # HTTP/2 200 + cabeceras de seguridad
curl -sI https://www.adrgarcia.com | grep -i location     # → https://adrgarcia.com/
```

nginx redirige `www` al dominio sin `www` con un 301.

## Opcional: restringir quién emite certificados (CAA)

En hPanel puedes agregar dos registros `CAA` con nombre `@`:
- `0 issue "pki.goog"`
- `0 issue "letsencrypt.org"`

Así solo las autoridades que usa Google pueden emitir certificados para tu dominio. **Si ya tienes otros `CAA`** (por ejemplo, para el SSL de Hostinger), no borres nada; agrega estos dos.

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| `Domain … is not verified` en `map` | Verificaste con otra cuenta de Google. La cuenta de Search Console debe ser la misma que usa `gcloud` (`gcloud config get-value account`) |
| El certificado sigue en `CertificatePending` después de 24 h | Quedó un `A` viejo de Hostinger en `@`, el CDN de Hostinger está activo, o hay un `CAA` que no permite `pki.goog` |
| `www` no carga | Falta el `CNAME www → ghs.googlehosted.com`, o todavía existe el CNAME anterior |
| Dejó de llegar el correo | Borraste un `MX` o un `TXT` de SPF por error. Restáuralo en hPanel |

> ¿Prefieres Cloud DNS algún día? La variante sigue disponible en `infra/alt-04-domain-clouddns.sh`.
