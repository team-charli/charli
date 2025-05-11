import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PinataSDK } from 'pinata';

// Bindings type for environment variables
type Bindings = {
  PINATA_JWT: string;
};

// Create Hono instance
const app = new Hono<{ Bindings: Bindings }>();

// Setup CORS middleware
app.use(
  '*',
  cors({
    origin: '*', // Adjust for production
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

// IPFS CID retrieval endpoint
app.get('/ipfs/:cid', async (c) => {
  const { cid } = c.req.param();

  // Initialize Pinata SDK
  const pinata = new PinataSDK({
    pinataJwt: c.env.PINATA_JWT,
    pinataGateway: 'chocolate-deliberate-squirrel-286.mypinata.cloud',
  });

  try {
    const cidResponse = await pinata.gateways.public.get(cid);

    if (!cidResponse.data) {
      return c.json({ error: 'CID not found on gateway' }, 404);
    }

    let data = cidResponse.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    return c.json(data);
  } catch (err) {
    console.error('Error fetching CID:', err);
    return c.json({ error: String(err) }, 500);
  }
});

export default app;
