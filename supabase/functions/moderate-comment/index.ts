import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "JSON inválido." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { article_id, parent_id = null, body: rawBody } = body ?? {};

    if (!article_id || typeof rawBody !== "string") {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const normalized = String(rawBody).trim().replace(/\s+/g, " ");

    if (normalized.length < 2 || normalized.length > 2000) {
      return new Response(
        JSON.stringify({ error: "El comentario debe tener entre 2 y 2000 caracteres." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const isSpamLike = /(https?:\/\/|www\.)/i.test(normalized) && normalized.length < 120;
    if (isSpamLike) {
      return new Response(
        JSON.stringify({ error: "Tu comentario parece spam o incluye enlaces no permitidos." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const blockedWordPattern =
      /(\b(?:puta|puto|culo|gil|gila|idiota|imbecil|nazi|matar|asesinar|violencia|mierda|mierd[ae]|cabr[oó]|hijo de puta|bastardo|pendejo|pendeja|retrasado|retrasada|mongol|mamon|perra|perro|maldito|maldita|pesado|desgraciado|cagada)\b)/i;

    if (blockedWordPattern.test(normalized)) {
      return new Response(
        JSON.stringify({
          error:
            "Tu comentario no es apto para esta comunidad. Por favor, elimina palabras ofensivas o contenido inapropiado y vuelve a intentarlo.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: "La moderación no está configurada en el servidor." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const moderationModels = [
      "omni-moderation-latest",
      "text-moderation-latest",
      "text-moderation-stable",
    ];

    let moderationResponse = null;
    let moderationData = null;
    let lastError = null;

    for (const model of moderationModels) {
      moderationResponse = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({ input: normalized, model }),
      });

      moderationData = await moderationResponse.json().catch(() => null);

      if (moderationResponse.ok) {
        break;
      }

      lastError = moderationData;
      const message = moderationData?.error?.message ?? "";
      const isUnsupportedModel =
        (message || "").toLowerCase().includes("model") || moderationResponse.status === 400;

      if (!isUnsupportedModel) {
        break;
      }
    }

    if (!moderationResponse || !moderationResponse.ok) {
      console.error("OpenAI moderation failed:", lastError ?? moderationData);
      return new Response(
        JSON.stringify({ error: "La moderación falló temporalmente. Inténtalo nuevamente." }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const result = moderationData?.results?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({ error: "La respuesta de moderación fue inválida." }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (result.flagged) {
      return new Response(
        JSON.stringify({
          error: "Tu comentario fue bloqueado por la moderación por contener contenido inapropiado, odio o spam.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
      return new Response(
        JSON.stringify({ error: "No se encontró token de autenticación." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Faltan variables de entorno del backend." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "No autorizado." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let parentCommentId = null;

    if (parent_id !== null && parent_id !== undefined && parent_id !== "") {
      const parsedParentId = Number(parent_id);

      if (!Number.isInteger(parsedParentId) || parsedParentId <= 0) {
        return new Response(
          JSON.stringify({ error: "parent_id inválido." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("id, article_id")
        .eq("id", parsedParentId)
        .maybeSingle();

      if (parentError) {
        console.error("Parent validation error:", parentError);
        return new Response(
          JSON.stringify({ error: "No se pudo validar la respuesta padre." }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (!parentComment || parentComment.article_id !== article_id) {
        return new Response(
          JSON.stringify({ error: "parent_id no válido para este artículo." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      parentCommentId = parsedParentId;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          article_id,
          parent_id: parentCommentId,
          user_id: user.id,
          body: normalized,
          like_count: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Insert comment error:", error);
      return new Response(
        JSON.stringify({ error: "No se pudo guardar el comentario." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, comment: data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
