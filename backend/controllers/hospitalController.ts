import { Request, Response } from 'express';
import { db } from '../config/db.ts';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function listHospitals(req: Request, res: Response): Promise<void> {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const location = String(req.query.location || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const userLat = req.query.lat ? Number(req.query.lat) : null;
    const userLng = req.query.lng ? Number(req.query.lng) : null;

    const rows = await db.query<any>('SELECT * FROM hospitals ORDER BY id ASC');

    let filtered = rows.map((h) => ({
      ...h,
      distance_km:
        userLat !== null && userLng !== null && !Number.isNaN(userLat) && !Number.isNaN(userLng)
          ? Number(haversineKm(userLat, userLng, Number(h.latitude), Number(h.longitude)).toFixed(1))
          : null,
    }));

    if (search) {
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.facilities.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search)
      );
    }

    if (location) {
      filtered = filtered.filter(
        (h) =>
          h.village_town.toLowerCase().includes(location) ||
          h.district.toLowerCase().includes(location) ||
          h.address.toLowerCase().includes(location)
      );
    }

    if (category && category !== 'all') {
      filtered = filtered.filter((h) => h.category.toLowerCase() === category.toLowerCase());
    }

    if (userLat !== null && userLng !== null) {
      filtered.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
    }

    res.json({ hospitals: filtered });
  } catch (err) {
    console.error('List hospitals error:', err);
    res.status(500).json({ error: 'Unable to fetch nearby hospitals.' });
  }
}
