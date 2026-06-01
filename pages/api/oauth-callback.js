
export default function handler(req, res) {
  const cid = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const sec = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const ref = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';
  res.status(200).json({
    cid_start: cid.slice(0,15),
    cid_len: cid.length,
    sec_end: sec.slice(-8),
    sec_len: sec.length,
    ref_end: ref.slice(-10),
    ref_len: ref.length
  });
}
