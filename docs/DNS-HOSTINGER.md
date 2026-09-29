# Apuntar adrgarcia.com (Hostinger) a Cloud Run usando Cloud DNS

Hostinger seguirá siendo el **registrador** (ahí renuevas el dominio), pero las respuestas DNS las dará **Cloud DNS**. El orden importa: sigue los pasos tal cual.

## Paso 0 — Inventario (5 min, evita perder tu correo)

En hPanel → **Dominios → adrgarcia.com → DNS / Nameservers → Registros DNS**, anota todo lo que no sea el sitio web:

- `MX` (correo de Hostinger, Google Workspace, etc.)
- `TXT` de SPF (`v=spf1 …`), DKIM y DMARC (`_dmarc`)
- Cualquier `CNAME` o `TXT` de verificación de otros servicios

Si no usas correo con este dominio, puedes saltarte esto.

## Paso 1 — Crear la zona en Cloud DNS

```bash
bash infra/04-domain-dns.sh zone
```

La salida muestra 4 nameservers, parecidos a estos:

```
ns-cloud-a1.googledomains.com
ns-cloud-a2.googledomains.com
ns-cloud-a3.googledomains.com
ns-cloud-a4.googledomains.com
```

Copia a Cloud DNS los registros del Paso 0. Ejemplo para el correo de Hostinger (usa **tus** valores):

```bash
gcloud dns record-sets create adrgarcia.com. --zone=adrgarcia-com --type=MX --ttl=3600 \
  --rrdatas="5 mx1.hostinger.com.,10 mx2.hostinger.com."
gcloud dns record-sets create adrgarcia.com. --zone=adrgarcia-com --type=TXT --ttl=3600 \
  --rrdatas='"v=spf1 include:_spf.mail.hostinger.com ~all"'
```

## Paso 2 — Cambiar los nameservers en Hostinger

1. hPanel → **Dominios** → `adrgarcia.com` → **DNS / Nameservers**.
2. **Cambiar nameservers** → *Cambiar a nameservers personalizados*.
3. Pega los 4 nameservers de Cloud DNS **sin el punto final** y guarda.
4. Si Hostinger tenía **DNSSEC** activado para el dominio, desactívalo antes. Si no, la resolución falla.

La propagación suele tardar entre 15 minutos y unas horas, con un máximo de 48 h. Compruébalo así:

```bash
dig +short NS adrgarcia.com     # debe listar ns-cloud-*.googledomains.com
```

## Paso 3 — Verificar que el dominio es tuyo (Google Search Console)

```bash
bash infra/04-domain-dns.sh verify
```

1. Se abre Search Console. Elige **Proveedor de nombres de dominio → Otro** y copia el valor `google-site-verification=…`.
2. Pégalo en la terminal. El script crea el `TXT` en Cloud DNS, no en Hostinger.
3. Cuando `dig +short TXT adrgarcia.com` muestre el valor, pulsa **Verificar** en Search Console.

## Paso 4 — Conectar el dominio con Cloud Run

```bash
bash infra/04-domain-dns.sh map
```

El script crea los *domain mappings* de `adrgarcia.com` y `www.adrgarcia.com`, y copia a Cloud DNS los registros que pide Cloud Run:

| Nombre | Tipo | Valor |
|---|---|---|
| `adrgarcia.com.` | A | 216.239.32.21, 216.239.34.21, 216.239.36.21, 216.239.38.21 |
| `adrgarcia.com.` | AAAA | 2001:4860:4802:32::15, …:34::15, …:36::15, …:38::15 |
| `www.adrgarcia.com.` | CNAME | `ghs.googlehosted.com.` |
| `adrgarcia.com.` | CAA | Solo `pki.goog` y `letsencrypt.org` pueden emitir certificados |

Los valores reales los toma el script de `gcloud beta run domain-mappings describe`. La tabla es solo una referencia.

nginx redirige `www` al dominio sin `www` con un 301.

## Paso 5 — Esperar el certificado HTTPS

```bash
bash infra/04-domain-dns.sh status
```

Cuando ambos dominios aparezcan como `Ready = True`, el certificado administrado ya está emitido. Suele tardar unos 15 minutos y puede llegar a 24 h. Después comprueba:

```bash
curl -sI https://adrgarcia.com | grep -iE "^HTTP|strict-transport|content-security"
curl -sI https://www.adrgarcia.com | grep -i location     # → https://adrgarcia.com/
```

## Paso 6 (opcional) — DNSSEC

Cuando todo funcione, puedes firmar la zona:

```bash
gcloud dns managed-zones update adrgarcia-com --dnssec-state=on
gcloud dns dns-keys list --zone=adrgarcia-com --filter="type=keySigning" --format="value(ds_record())"
```

Después, en hPanel → **DNSSEC**, agrega el registro DS con los valores de *key tag*, algoritmo, tipo de digest y digest. Un DS incorrecto deja el dominio fuera de línea, así que hazlo con calma y verifica con <https://dnsviz.net>.

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| `Domain … is not verified` en el paso 4 | La verificación de Search Console no ha terminado, o la hiciste con otra cuenta de Google distinta a la de `gcloud` |
| El certificado lleva > 24 h en `CertificatePending` | Hay registros A/AAAA antiguos de Hostinger en caché, o un CAA que no permite `pki.goog` |
| Dejó de llegar el correo | Faltó copiar los MX/SPF del Paso 0 |
| `ERR_TOO_MANY_REDIRECTS` | Algún proxy o CDN externo está forzando HTTP. Cloud Run ya sirve HTTPS |
