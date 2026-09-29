# UX Discovery — adrgarcia.com (29 sep 2026)

## 1. Problem Brief
- **Problema:** Adrián necesita una carta de presentación digital que, en menos de un minuto, deje claro quién es, qué ha logrado y que sus credenciales son reales.
- **Usuarios afectados:** reclutadores y hiring managers; clientes y partners del ecosistema Google Cloud.
- **Alternativas actuales:** perfil de LinkedIn, CV en PDF adjunto y enlaces sueltos de Credly.
- **Por qué fallan:** la información está dispersa, el PDF no se ve bien en móvil, verificar 6 credenciales exige 6 clics en 6 lugares y no hay una marca personal propia.
- **Alcance:** producto nuevo (sitio personal) con infraestructura propia en GCP.

## 2. Personas
| Prioridad | Persona | Contexto | Objetivo | Fricción |
|---|---|---|---|---|
| 1 | **Reclutadora técnica** | Revisa 30–60 perfiles al día, a menudo desde el celular y llegando desde LinkedIn | Decidir en menos de 90 s si agenda una llamada | Tiene que verificar certificaciones y fechas; el CV no es legible en móvil |
| 2 | **Hiring manager / cliente (CTO, líder de datos)** | Evalúa antes de una reunión o PoC | Confirmar experiencia real en migraciones, datos y seguridad | Quiere ver resultados medibles, no listas de tecnologías |
| 3 | **Adrián** | Comparte el enlace en firmas, propuestas y eventos | Un solo enlace que lo represente | Mantener el contenido al día sin tocar código complejo |

## 3. Jobs to Be Done
- **Funcional:** *Cuando reviso a un candidato cloud, quiero verificar sus certificaciones y resultados en un solo lugar, para decidir rápido si avanzo.*
- **Emocional:** *…quiero sentir confianza de que lo que leo es verificable.*
- **Social:** *…quiero poder reenviar el enlace a mi equipo sin tener que explicar nada.*

## 4. Journey
| Etapa | Estado actual | Estado deseado (implementado) |
|---|---|---|
| Llegada | Enlace a LinkedIn con mucho ruido | La vista previa OG muestra foto, rol y 6 badges |
| Primer vistazo | Hay que abrir el PDF | En el hero están nombre, rol, propuesta de valor, CTA y la prueba de 6 certificaciones |
| Evaluación | Hay que leer el CV completo | Timeline con logos, resultados en negritas y logros expandibles |
| Verificación | Buscar cada credencial | Tarjeta → Credly en pestaña nueva, o el PDF en el visor integrado |
| Acción | Copiar el correo del PDF | Botón de correo, copia al portapapeles, LinkedIn y descarga del CV |

## 5. Métricas de éxito (sin trackers por decisión de privacidad)
- **Adopción:** conversaciones iniciadas por correo o LinkedIn que mencionen el sitio (registro manual de Adrián).
- **Salud:** visitas y errores 4xx/5xx en los logs de Cloud Run (`gcloud run services logs read`), sin cookies.
- **Calidad:** Lighthouse ≥ 95 en rendimiento y accesibilidad; `tests/validate.mjs` en verde en cada deploy.
- Si más adelante se quiere analítica, que sea sin cookies y alojada en el mismo origen, sin romper la CSP.

## 6. Principios de diseño
1. Verificable antes que declarativo.
2. Primero se escanea, luego se profundiza.
3. Ingeniería y negocio en la misma frase.
4. Rápido y privado por construcción.

## 7. Supuestos y riesgos
- *Supuesto no validado:* los reclutadores prefieren español por defecto. Mitigación: `/en/` y un selector visible.
- *Riesgo:* la certificación Professional Data Engineer vence el **20 dic 2026**. Hay que renovarla y actualizar `src/content.mjs`.
- *Riesgo:* los *domain mappings* de Cloud Run están en Preview. Hay una alternativa documentada (Load Balancer o Firebase Hosting).

## 8. Siguientes pasos
- Revisar el copy con Adrián, en especial la frase de la propuesta de valor.
- Añadir casos de estudio (arquitecturas reales anonimizadas) cuando haya material aprobado.
