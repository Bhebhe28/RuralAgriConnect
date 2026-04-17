import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, getDoc, setDoc, updateDoc, deleteDoc, now } from '../db/firestore';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import * as admin from 'firebase-admin';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function uploadImage(buffer: Buffer, mimetype: string, folder: string): Promise<string> {
  const bucket = admin.storage().bucket();
  const fileName = `${folder}/${Date.now()}-${uuidv4()}`;
  const file = bucket.file(fileName);
  await file.save(buffer, { contentType: mimetype });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const posts = await getDocs<any>('community_posts', [], { field: 'created_at', dir: 'desc' });
  res.json(posts);
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const post = await getDoc<any>('community_posts', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const replies = await getDocs<any>('community_replies',
    [['post_id', '==', req.params.id]], { field: 'created_at', dir: 'asc' });
  res.json({ ...post, replies });
});

router.post('/', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  const { title, body, category } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

  let imageUrl = null;
  if (req.file) imageUrl = await uploadImage(req.file.buffer, req.file.mimetype, 'community');

  const id = uuidv4();
  await setDoc('community_posts', id, {
    user_id: req.user!.id, title, body,
    category: category || 'general',
    image_url: imageUrl, likes: 0,
    created_at: now(), updated_at: now(),
  });
  res.status(201).json({ id, message: 'Post created', image_url: imageUrl });
});

router.post('/:id/replies', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });

  let imageUrl = null;
  if (req.file) imageUrl = await uploadImage(req.file.buffer, req.file.mimetype, 'community');

  const id = uuidv4();
  await setDoc('community_replies', id, {
    post_id: req.params.id, user_id: req.user!.id,
    body, image_url: imageUrl, created_at: now(),
  });
  res.status(201).json({ id, message: 'Reply added', image_url: imageUrl });
});

router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const post = await getDoc<any>('community_posts', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  await updateDoc('community_posts', req.params.id, { likes: (post.likes || 0) + 1 });
  res.json({ message: 'Liked' });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const post = await getDoc<any>('community_posts', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.user!.id && req.user!.role !== 'admin')
    return res.status(403).json({ error: 'Not allowed' });
  const replies = await getDocs('community_replies', [['post_id', '==', req.params.id]]);
  await Promise.all(replies.map((r: any) => deleteDoc('community_replies', r.id)));
  await deleteDoc('community_posts', req.params.id);
  res.json({ message: 'Post deleted' });
});

export default router;
