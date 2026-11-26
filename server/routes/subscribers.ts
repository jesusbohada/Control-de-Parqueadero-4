/**
 * Rutas de la API (subscribers). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import pool, { isPostgresReady, memoryStoreRef } from '../../src/db.ts';

export function registerSubscriberRoutes(app: express.Express) {
  // -------------------------------------------------------------
  // ABONADOS / MENSUALIDADES (SUBSCRIBERS)
  // -------------------------------------------------------------
  app.get('/api/subscribers', async (req, res) => {
    try {
      if (isPostgresReady()) {
        const result = await pool.query('SELECT * FROM subscribers ORDER BY end_date ASC');
        const subscribers = result.rows.map(r => {
          const endDate = r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date).split('T')[0];
          const startDate = r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date).split('T')[0];
          
          let computedStatus = r.status || 'active';
          if (computedStatus !== 'suspended') {
            const now = new Date();
            const exp = new Date(endDate + 'T23:59:59');
            const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
              computedStatus = 'expired';
            } else if (diffDays <= 3) {
              computedStatus = 'expiring_soon';
            } else {
              computedStatus = 'active';
            }
          }

          return {
            id: r.id,
            fullName: r.full_name,
            documentId: r.document_id,
            phone: r.phone || '',
            email: r.email || '',
            plate: (r.plate || '').toUpperCase().trim(),
            vehicleType: r.vehicle_type || 'car',
            monthlyRate: Number(r.monthly_rate) || 0,
            startDate,
            endDate,
            assignedSpotCode: r.assigned_spot_code || '',
            status: computedStatus,
            notes: r.notes || '',
            lastPaymentDate: r.last_payment_date instanceof Date ? r.last_payment_date.toISOString() : String(r.last_payment_date),
            paymentMethod: r.payment_method || 'cash',
            paymentReference: (typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {})).paymentReference || '',
            voucherNumber: (typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {})).voucherNumber || '',
            registeredBy: (typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {})).registeredBy || ''
          };
        });
        return res.json({ success: true, subscribers });
      }

      const subscribers = Array.from((memoryStoreRef as any).subscribers?.values() || []);
      res.json({ success: true, subscribers });
    } catch (err: any) {
      console.error('[Get Subscribers Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/subscribers/check/:plate', async (req, res) => {
    try {
      const cleanPlate = (req.params.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!cleanPlate) {
        return res.status(400).json({ success: false, error: 'Placa no especificada' });
      }

      if (isPostgresReady()) {
        const query = `
          SELECT * FROM subscribers 
          WHERE UPPER(REPLACE(plate, '-', '')) = $1 
          ORDER BY end_date DESC, last_payment_date DESC 
          LIMIT 1
        `;
        const result = await pool.query(query, [cleanPlate]);
        if (result.rows.length === 0) {
          return res.json({ success: true, isSubscriber: false, subscriber: null });
        }

        const r = result.rows[0];
        const endDate = r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date).split('T')[0];
        const startDate = r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date).split('T')[0];
        
        let computedStatus = r.status || 'active';
        if (computedStatus !== 'suspended') {
          const now = new Date();
          const exp = new Date(endDate + 'T23:59:59');
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            computedStatus = 'expired';
          } else if (diffDays <= 3) {
            computedStatus = 'expiring_soon';
          } else {
            computedStatus = 'active';
          }
        }

        const subscriber = {
          id: r.id,
          fullName: r.full_name,
          documentId: r.document_id,
          phone: r.phone || '',
          email: r.email || '',
          plate: r.plate,
          vehicleType: r.vehicle_type,
          monthlyRate: Number(r.monthly_rate) || 0,
          startDate,
          endDate,
          assignedSpotCode: r.assigned_spot_code,
          status: computedStatus,
          notes: r.notes,
          lastPaymentDate: r.last_payment_date,
          paymentMethod: r.payment_method,
          paymentReference: (typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {})).paymentReference || '',
          voucherNumber: (typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {})).voucherNumber || ''
        };

        return res.json({
          success: true,
          isSubscriber: true,
          isAuthorized: computedStatus === 'active' || computedStatus === 'expiring_soon',
          subscriber
        });
      }

      const found: any = Array.from((memoryStoreRef as any).subscribers?.values() || []).find((s: any) => 
        (s.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate
      );
      if (!found) {
        return res.json({ success: true, isSubscriber: false, subscriber: null });
      }
      return res.json({
        success: true,
        isSubscriber: true,
        isAuthorized: found.status === 'active' || found.status === 'expiring_soon',
        subscriber: found
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/subscribers', async (req, res) => {
    try {
      const { subscriber } = req.body;
      if (!subscriber?.plate || !subscriber?.fullName) {
        return res.status(400).json({ success: false, error: 'La placa y nombre del titular son obligatorios' });
      }

      const id = subscriber.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cleanPlate = (subscriber.plate || '').toUpperCase().trim();
      const monthlyRate = Number(subscriber.monthlyRate) || 0;
      const startDate = subscriber.startDate || new Date().toISOString().split('T')[0];
      const endDate = subscriber.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const details = {
        paymentReference: subscriber.paymentReference || '',
        voucherNumber: subscriber.voucherNumber || '',
        registeredBy: subscriber.registeredBy || 'caja'
      };

      if (isPostgresReady()) {
        const query = `
          INSERT INTO subscribers (
            id, full_name, document_id, phone, email, plate, vehicle_type, 
            monthly_rate, start_date, end_date, assigned_spot_code, status, 
            notes, last_payment_date, payment_method, details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            document_id = EXCLUDED.document_id,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            plate = EXCLUDED.plate,
            vehicle_type = EXCLUDED.vehicle_type,
            monthly_rate = EXCLUDED.monthly_rate,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            assigned_spot_code = EXCLUDED.assigned_spot_code,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            last_payment_date = EXCLUDED.last_payment_date,
            payment_method = EXCLUDED.payment_method,
            details = EXCLUDED.details
        `;
        await pool.query(query, [
          id,
          subscriber.fullName,
          subscriber.documentId || '',
          subscriber.phone || '',
          subscriber.email || '',
          cleanPlate,
          subscriber.vehicleType || 'car',
          monthlyRate,
          startDate,
          endDate,
          subscriber.assignedSpotCode || null,
          subscriber.status || 'active',
          subscriber.notes || '',
          subscriber.lastPaymentDate || new Date().toISOString(),
          subscriber.paymentMethod || 'cash',
          JSON.stringify(details)
        ]);
      } else {
        (memoryStoreRef as any).subscribers.set(id, { ...subscriber, id, plate: cleanPlate });
      }

      res.json({ success: true, subscriber: { ...subscriber, id, plate: cleanPlate } });
    } catch (err: any) {
      console.error('[Save Subscriber Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/subscribers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (isPostgresReady()) {
        await pool.query('DELETE FROM subscribers WHERE id = $1', [id]);
      } else {
        (memoryStoreRef as any).subscribers.delete(id);
      }
      res.json({ success: true, message: 'Abonado eliminado correctamente' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
