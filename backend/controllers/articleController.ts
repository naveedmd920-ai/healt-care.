import { Request, Response } from 'express';
import { db } from '../config/db.ts';

export async function listArticles(req: Request, res: Response): Promise<void> {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const language = String(req.query.language || '').trim();

    let rows = await db.query<any>(
      'SELECT * FROM health_articles WHERE is_reviewed = 1 ORDER BY published_date DESC, id DESC'
    );

    if (category && category !== 'all') {
      rows = rows.filter((a) => a.category.toLowerCase() === category.toLowerCase());
    }
    if (language && language !== 'all') {
      rows = rows.filter((a) => a.language === language);
    }
    if (search) {
      rows = rows.filter(
        (a) =>
          a.title.toLowerCase().includes(search) ||
          a.short_description.toLowerCase().includes(search) ||
          a.content.toLowerCase().includes(search)
      );
    }

    res.json({ articles: rows });
  } catch (err) {
    console.error('List articles error:', err);
    res.status(500).json({ error: 'Unable to load health articles.' });
  }
}

export async function getArticleById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    const article = await db.get<any>('SELECT * FROM health_articles WHERE id = ?', [id]);
    if (!article) {
      res.status(404).json({ error: 'Health article not found.' });
      return;
    }
    res.json({ article });
  } catch (err) {
    console.error('Get article error:', err);
    res.status(500).json({ error: 'Unable to load health article.' });
  }
}
