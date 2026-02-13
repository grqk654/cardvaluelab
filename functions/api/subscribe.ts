/**
 * Optional endpoint if you later want to add users to a Brevo list.
 * For V1, you can skip this and rely on transactional email only.
 */
export const onRequestPost: PagesFunction<{ BREVO_API_KEY: string; }> = async (context) => {
  return new Response(JSON.stringify({ ok: true, note: "Not implemented in V1." }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
