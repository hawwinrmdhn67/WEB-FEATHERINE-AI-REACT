const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = "llama3-8b-8192"; // Atau ganti dengan "llama3-70b-8192" jika kamu mau versi lebih besar

export const callGroqAPI = async (messages) => {
  if (!GROQ_API_KEY) {
    throw new Error("Groq API key belum disetel. Pastikan VITE_GROQ_API_KEY ada di file .env kamu.");
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API error:", errorData);
      throw new Error(`Gagal memanggil Groq API: ${JSON.stringify(errorData.error || errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Kesalahan dalam callGroqAPI:", error);
    throw error;
  }
};
