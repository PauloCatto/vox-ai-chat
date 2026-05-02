const fetch = require('node-fetch');

async function run() {
  const payload = {
    contents: [
      { role: 'user', parts: [{ text: 'Me fale sobre o medicamento ciclobenzaprina.' }] }
    ],
    systemInstruction: {
      parts: [{ text: 'Você é um assistente virtual geral. Você possui ferramentas para clima, hora e matemática. Para todo o resto, use seu conhecimento.' }]
    },
    tools: [{
      functionDeclarations: [
        { name: "get_current_time", description: "Obtém a data e hora" },
        { name: "get_weather", description: "Obtém o clima", parameters: { type: "OBJECT", properties: { location: { type: "STRING" } } } }
      ]
    }],
    stream: false
  };

  const res = await fetch('https://yqtumlcvvhmmmaamlcay.supabase.co/functions/v1/gemini-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log(res.status, text);
}

run();
