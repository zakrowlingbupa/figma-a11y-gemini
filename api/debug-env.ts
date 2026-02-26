
export default (req, res) => {
  res.json({
    hasKey: !!process.env.GOOGLE_API_KEY,
    keyLength: process.env.GOOGLE_API_KEY?.length || 0
  });
};
