import { Router } from 'express';
import { Evidencia } from './model';
import multer from 'multer';
import { google } from 'googleapis';
import { Usuario } from '../usuarios/model';
import archiver from 'archiver';
import { Readable } from 'stream';
import { Aporte } from '../aportes/model';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function getDriveClient(usuarioId: string) {
  const usuario = await Usuario.findOne({ supabaseId: usuarioId });
  
  if (!usuario?.googleTokens?.access_token) {
    return null; 
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials(usuario.googleTokens);
  
  if (usuario.googleTokens.expiry_date && 
      usuario.googleTokens.expiry_date < Date.now()) {
    try {
      oauth2Client.setCredentials({
        refresh_token: usuario.googleTokens.refresh_token
      });
      const { credentials } = await oauth2Client.refreshAccessToken();
      await Usuario.findOneAndUpdate(
        { supabaseId: usuarioId },
        { googleTokens: credentials }
      );
      oauth2Client.setCredentials(credentials);
    } catch {
      return null; 
    }
  }
  
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function crearEstructuraCarpetas(drive: any, usuarioId: string, contratoId: string, actividadId: string) {
  try {
    let rootFolder = await drive.files.list({
      q: `name='ContraSeguimiento' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });
    
    let rootFolderId;
    if (rootFolder.data.files.length === 0) {
      const folder = await drive.files.create({
        requestBody: {
          name: 'ContraSeguimiento',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      rootFolderId = folder.data.id;
    } else {
      rootFolderId = rootFolder.data.files[0].id;
    }
    
    const contratoFolder = await drive.files.list({
      q: `name='Contrato-${contratoId}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)'
    });
    
    let contratoFolderId;
    let contratoFolderUrl;
    if (contratoFolder.data.files.length === 0) {
      const folder = await drive.files.create({
        requestBody: {
          name: `Contrato-${contratoId}`,
          parents: [rootFolderId],
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id, webViewLink'
      });
      contratoFolderId = folder.data.id;
      contratoFolderUrl = folder.data.webViewLink;
    } else {
      contratoFolderId = contratoFolder.data.files[0].id;
      contratoFolderUrl = contratoFolder.data.files[0].webViewLink;
    }
    
    const actividadFolder = await drive.files.list({
      q: `name='Actividad-${actividadId}' and '${contratoFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)'
    });
    
    if (actividadFolder.data.files.length > 0) {
      return {
        carpetaId: actividadFolder.data.files[0].id,
        carpetaNombre: actividadFolder.data.files[0].name,
        url: actividadFolder.data.files[0].webViewLink
      };
    } else {
      const folder = await drive.files.create({
        requestBody: {
          name: `Actividad-${actividadId}`,
          parents: [contratoFolderId],
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id, name, webViewLink'
      });
      return {
        carpetaId: folder.data.id,
        carpetaNombre: folder.data.name,
        url: folder.data.webViewLink
      };
    }
  } catch (error) {
    console.error('Error creando estructura de carpetas:', error);
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const { usuarioId, contratoId } = req.query;
    
    if (!usuarioId || !contratoId) {
      return res.status(400).json({ error: 'usuarioId y contratoId son requeridos' });
    }

    const evidencias = await Evidencia.find({ 
      usuarioId: usuarioId.toString(),
      contratoId: contratoId.toString() 
    }).sort({ fecha: -1 });
    
    res.json(evidencias);
  } catch (error) {
    console.error('Error obteniendo evidencias:', error);
    res.status(500).json({ error: 'Error al obtener evidencias' });
  }
});

router.get('/actividad/:actividadId', async (req, res) => {
  try {
    const { actividadId } = req.params;
    const { usuarioId } = req.query;
    
    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    const evidencias = await Evidencia.find({ 
      actividadId: actividadId,
      usuarioId: usuarioId.toString() 
    }).sort({ fecha: -1 });
    
    res.json(evidencias);
  } catch (error) {
    console.error('Error obteniendo evidencias:', error);
    res.status(500).json({ error: 'Error al obtener evidencias' });
  }
});

router.get('/descargar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.query;
    
    const evidencia = await Evidencia.findOne({ 
      id: id,
      usuarioId: usuarioId?.toString() 
    });
    
    if (!evidencia) {
      return res.status(404).json({ error: 'Evidencia no encontrada' });
    }
    
    if (evidencia.local?.usado && evidencia.local?.data) {
      res.setHeader('Content-Type', evidencia.local.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${evidencia.archivo?.nombre || 'archivo'}"`);
      res.send(evidencia.local.data);
    } else if (evidencia.drive?.usado && evidencia.drive?.archivoId) {
      res.redirect(evidencia.drive.url || `https://drive.google.com/file/d/${evidencia.drive.archivoId}/view`);
    } else {
      res.status(404).json({ error: 'Archivo no disponible' });
    }
  } catch (error) {
    console.error('Error descargando evidencia:', error);
    res.status(500).json({ error: 'Error al descargar evidencia' });
  }
});

router.get('/contrato/:contratoId/zip', async (req, res) => {
  try {
    const { contratoId } = req.params;
    const { usuarioId } = req.query;
    
    console.log(`🔍 GET /evidencias/contrato/${contratoId}/zip - usuarioId:`, usuarioId);
    
    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId requerido' });
    }
    
    const evidencias = await Evidencia.find({ 
      contratoId,
      usuarioId: usuarioId.toString()
    });
    
    console.log(`📦 ${evidencias.length} evidencias encontradas`);
    
    if (evidencias.length === 0) {
      return res.status(404).json({ error: 'No hay evidencias para este contrato' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=evidencias-contrato-${contratoId}.zip`);
    
    const archive = archiver('zip', {
      zlib: { level: 9 } 
    });
    
    archive.on('error', (err) => {
      console.error('❌ Error en archiver:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al crear ZIP' });
      }
    });
    
    archive.pipe(res);
    
    const porActividad: Record<string, any[]> = {};
    evidencias.forEach(ev => {
      const actividadId = ev.actividadId || 'sin-actividad';
      if (!porActividad[actividadId]) {
        porActividad[actividadId] = [];
      }
      porActividad[actividadId].push(ev);
    });
    
    for (const [actividadId, evs] of Object.entries(porActividad)) {
      const folderName = `Actividad-${actividadId.substring(0, 8)}`;
      
      for (const ev of evs) {
        try {
          let fileName = `${folderName}/`;
          
          if (ev.archivo?.nombre) {
            fileName += ev.archivo.nombre;
          } else if (ev.nombre) {
            fileName += ev.nombre;
          } else {
            fileName += `evidencia-${ev.id}.txt`;
          }
          
          if (ev.local?.usado && ev.local?.data) {
            archive.append(ev.local.data, { name: fileName });
            console.log(`✅ Agregado desde MongoDB: ${fileName}`);
            
          } else if (ev.drive?.usado && ev.drive?.archivoId) {
            try {
              const drive = await getDriveClient(usuarioId as string);
              if (drive) {
                const fileResponse = await drive.files.get({
                  fileId: ev.drive.archivoId,
                  alt: 'media'
                }, { responseType: 'stream' });
                
                archive.append(fileResponse.data, { name: fileName });
                console.log(`✅ Agregado desde Drive: ${fileName}`);
              } else {
                const errorContent = `No se pudo descargar de Google Drive. Archivo ID: ${ev.drive.archivoId}`;
                archive.append(errorContent, { name: `${fileName}.error.txt` });
              }
            } catch (driveError) {
              console.error(`Error descargando de Drive:`, driveError);
              const errorContent = `Error al descargar de Google Drive. Archivo ID: ${ev.drive.archivoId}`;
              archive.append(errorContent, { name: `${fileName}.error.txt` });
            }
            
          } else if (ev.enlace?.url) {
            const urlContent = `[InternetShortcut]\nURL=${ev.enlace.url}`;
            archive.append(urlContent, { name: fileName.replace(/\.url$/, '') + '.url' });
            console.log(`✅ Agregado enlace: ${fileName}`);
            
          } else if (ev.nota?.contenido) {
            const contenido = ev.nota.titulo 
              ? `${ev.nota.titulo}\n\n${ev.nota.contenido}`
              : ev.nota.contenido;
            archive.append(contenido, { name: fileName.replace(/\.txt$/, '') + '.txt' });
            console.log(`✅ Agregado nota: ${fileName}`);
          }
        } catch (itemError) {
          console.error(`Error procesando evidencia ${ev.id}:`, itemError);
        }
      }
    }
    
    console.log('📦 Finalizando ZIP...');
    await archive.finalize();
    
  } catch (error) {
    console.error('❌ Error creando ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al crear ZIP' });
    }
  }
});

router.get('/aporte/:aporteId/zip', async (req, res) => {
  try {
    const { aporteId } = req.params;
    const { usuarioId } = req.query;

    if (!usuarioId) {
      return res.status(400).json({
        error: 'usuarioId requerido'
      });
    }

    const aporte = await Aporte.findOne({
      id: aporteId,
      usuarioId: usuarioId.toString()
    });

    if (!aporte) {
      return res.status(404).json({
        error: 'Aporte no encontrado'
      });
    }

    const evidenciaIds = aporte.evidenciaIds || [];

    if (evidenciaIds.length === 0) {
      return res.status(404).json({
        error: 'Este aporte no tiene evidencias'
      });
    }

    const evidencias = await Evidencia.find({
      id: { $in: evidenciaIds }
    });

    if (evidencias.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron evidencias'
      });
    }

    res.setHeader(
      'Content-Type',
      'application/zip'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=evidencias-aporte-${aporteId}.zip`
    );

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', err => {
      console.error(err);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Error creando ZIP'
        });
      }
    });

    archive.pipe(res);

    for (const ev of evidencias) {
      try {

        let fileName =
          ev.archivo?.nombre ||
          ev.nombre ||
          `evidencia-${ev.id}`;

        if (
          ev.local?.usado &&
          ev.local?.data
        ) {

          archive.append(
            ev.local.data,
            { name: fileName }
          );

        } else if (
          ev.drive?.usado &&
          ev.drive?.archivoId
        ) {

          const drive =
            await getDriveClient(
              usuarioId as string
            );

          if (drive) {

            const fileResponse =
              await drive.files.get(
                {
                  fileId:
                    ev.drive.archivoId,
                  alt: 'media'
                },
                {
                  responseType:
                    'stream'
                }
              );

            archive.append(
              fileResponse.data,
              { name: fileName }
            );
          }

        } else if (ev.enlace?.url) {

          archive.append(
            `[InternetShortcut]\nURL=${ev.enlace.url}`,
            {
              name:
                fileName.replace(
                  /\.url$/,
                  ''
                ) + '.url'
            }
          );

        } else if (ev.nota?.contenido) {

          archive.append(
            ev.nota.contenido,
            {
              name:
                fileName.replace(
                  /\.txt$/,
                  ''
                ) + '.txt'
            }
          );
        }

      } catch (error) {
        console.error(
          'Error procesando evidencia:',
          error
        );
      }
    }

    await archive.finalize();

  } catch (error) {

    console.error(error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error al crear ZIP'
      });
    }
  }
});

router.post('/',upload.array('archivos'), async (req, res) => {
    try {
      const {
        usuarioId,
        contratoId,
        actividadId,
        aporteId
      } = req.body;

      if (!usuarioId || !contratoId || !actividadId) {
        return res.status(400).json({error: 'Faltan datos requeridos'});
      }

      const archivos: Express.Multer.File[] =
        Array.isArray(req.files)
          ? (req.files as Express.Multer.File[])
          : [];

      const evidencias = req.body.evidencias? JSON.parse(req.body.evidencias): [];

      if (archivos.length === 0 && evidencias.length === 0) {
        return res.status(400).json({error: 'Debe enviar al menos una evidencia'});
      }

      const drive = await getDriveClient(usuarioId);
      let carpetas = null;

      if (drive) {
        try {carpetas = await crearEstructuraCarpetas(
              drive,
              usuarioId,
              contratoId,
              actividadId
            );
        } catch (error) {console.error(error);}
      }

      const evidenciasGuardadas: any[] = [];

      // ARCHIVOS
      for (const archivo of archivos) {let driveInfo: any = {usado: false};

        if (drive && carpetas) {
          try {
            const file =
              await drive.files.create({
                requestBody: {
                  name: archivo.originalname,
                  parents: [carpetas.carpetaId]
                },
                media: {
                  mimeType: archivo.mimetype,
                  body: Readable.from(
                    archivo.buffer
                  )
                },
                fields:
                  'id,name,webViewLink'
              });
            driveInfo = {
              usado: true,
              carpetaId:
                carpetas.carpetaId,
              carpetaNombre:
                carpetas.carpetaNombre,
              url: carpetas.url,
              archivoId:
                file.data.id
            };
          } catch (error) {
            console.error(error);
          }
        }

        const nuevaEvidencia =
          await Evidencia.create({
            id: `EV-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,

            actividadId,
            contratoId,
            usuarioId,

            tipo: 'archivo',

            nombre:
              archivo.originalname,

            archivo: {
              nombre:
                archivo.originalname,
              tamaño: archivo.size,
              tipo: archivo.mimetype
            },

            drive: driveInfo,

            local: driveInfo.usado
              ? { usado: false }
              : {
                  usado: true,
                  data: archivo.buffer,
                  contentType:
                    archivo.mimetype,
                  tamaño:
                    archivo.size
                },

            fecha: new Date()
          });

        evidenciasGuardadas.push(
          nuevaEvidencia
        );
      }

      // NOTAS Y ENLACES
      for (const evidencia of evidencias) {

        let driveInfo: any = {
          usado: false
        };

        if (drive && carpetas) {
          try {

            let nombreArchivo: string | undefined;
            let buffer: Buffer | undefined;
            let mimeType: string | undefined;

            if (
              evidencia.tipo ===
              'enlace'
            ) {
              nombreArchivo =
                evidencia.titulo
                  ? `${evidencia.titulo}.url`
                  : `enlace-${Date.now()}.url`;

              buffer = Buffer.from(
                `[InternetShortcut]\nURL=${evidencia.url}`
              );

              mimeType =
                'application/internet-shortcut';
            }

            if (
              evidencia.tipo ===
              'nota'
            ) {
              nombreArchivo =
                evidencia.titulo
                  ? `${evidencia.titulo}.txt`
                  : `nota-${Date.now()}.txt`;

              buffer = Buffer.from(
                evidencia.titulo
                  ? `${evidencia.titulo}\n\n${evidencia.contenido}`
                  : evidencia.contenido
              );

              mimeType = 'text/plain';
            }

            if (!nombreArchivo || !buffer || !mimeType) {
              continue;
            }

            const file =
              await drive.files.create({
                requestBody: {
                  name: nombreArchivo,
                  parents: [carpetas.carpetaId]
                },
                media: {
                  mimeType,
                  body:
                    Readable.from(
                      buffer
                    )
                },
                fields:
                  'id,name,webViewLink'
              });

            driveInfo = {
              usado: true,
              carpetaId:
                carpetas.carpetaId,
              carpetaNombre:
                carpetas.carpetaNombre,
              url: carpetas.url,
              archivoId:
                file.data.id
            };

          } catch (error) {
            console.error(error);
          }
        }

        const documento: any = {
          id: `EV-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,

          actividadId,
          contratoId,
          usuarioId,

          tipo: evidencia.tipo,

          nombre:
            evidencia.titulo ||
            evidencia.url ||
            'Nota',

          drive: driveInfo,

          local: {
            usado: false
          },

          fecha: new Date()
        };

        if (
          evidencia.tipo ===
          'enlace'
        ) {
          documento.enlace = {
            url: evidencia.url,
            titulo:
              evidencia.titulo,
            descripcion:
              evidencia.descripcion
          };
        }

        if (
          evidencia.tipo ===
          'nota'
        ) {
          documento.nota = {
            titulo:
              evidencia.titulo,
            contenido:
              evidencia.contenido
          };
        }

        const nuevaEvidencia =
          await Evidencia.create(
            documento
          );

        evidenciasGuardadas.push(
          nuevaEvidencia
        );
      }

      const evidenciaIds =
        evidenciasGuardadas.map(
          evidencia => evidencia.id
        );

      if (aporteId) {
        await Aporte.updateOne(
          { id: aporteId },
          {
            $addToSet: {
              evidenciaIds: {
                $each: evidenciaIds
              }
            }
          }
        );
      }
      return res.json({
        total: evidenciasGuardadas.length,
        evidenciaIds,
        evidencias: evidenciasGuardadas
      });

    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Error guardando evidencias'
      });
    }
  }
);

export default router;