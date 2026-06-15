import { Router } from 'express';
import { Aporte } from './model';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { usuarioId, contratoId } = req.query;
    
    console.log('🔍 GET /api/aportes - usuarioId:', usuarioId, 'contratoId:', contratoId);
    
    if (!usuarioId || !contratoId) {
      return res.status(400).json({ error: 'usuarioId y contratoId son requeridos' });
    }

    const aportes = await Aporte.find({ 
      usuarioId: usuarioId.toString(),
      contratoId: contratoId.toString() 
    }).sort({ fecha: -1 });
    
    console.log(`✅ ${aportes.length} aportes encontrados`);
    res.json(aportes);
  } catch (error) {
    console.error('❌ Error obteniendo aportes:', error);
    res.status(500).json({ error: 'Error al obtener aportes' });
  }
});

router.get('/actividad/:actividadId', async (req, res) => {
  try {
    const { actividadId } = req.params;
    const { usuarioId } = req.query;
    
    console.log(`🔍 GET /api/aportes/actividad/${actividadId} - usuarioId:`, usuarioId);
    
    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    const aportes = await Aporte.find({ 
      actividadId: actividadId,
      usuarioId: usuarioId.toString()
    }).sort({ fecha: -1 });
    
    console.log(`✅ ${aportes.length} aportes encontrados`);
    res.json(aportes);
  } catch (error) {
    console.error('❌ Error obteniendo aportes:', error);
    res.status(500).json({ error: 'Error al obtener aportes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      usuarioId,
      contratoId,
      actividadId,
      evidencias = [],
      ...aporteData
    } = req.body;

    if (!usuarioId || !contratoId || !actividadId) {
      return res.status(400).json({
        error: 'usuarioId, contratoId y actividadId son requeridos'
      });
    }
    const aporteId = req.body.id || `AP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nuevoAporte = new Aporte({...aporteData,
      id: aporteId,
      usuarioId,
      contratoId,
      actividadId,
      evidenciaIds: [],
      creadoEn: new Date()
    });

    await nuevoAporte.save();

    res.status(201).json(nuevoAporte);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Error al crear aporte'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { usuarioId } = req.query

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' })
    }

    const aporteActualizado = await Aporte.findOneAndUpdate(
      {
        id,
        usuarioId: usuarioId.toString()
      },
      {
        ...req.body
      },
      {
        new: true
      }
    )

    if (!aporteActualizado) {
      return res.status(404).json({ error: 'Aporte no encontrado' })
    }

    console.log('✅ Aporte actualizado:', id)

    res.json(aporteActualizado)

  } catch (error) {
    console.error('❌ Error actualizando aporte:', error)
    res.status(500).json({ error: 'Error al actualizar aporte' })
  }
})

export default router;