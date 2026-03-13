import { NextResponse } from "next/server";

import {
  getTelegramAllowedChatIds,
  getTelegramBotToken,
  getTelegramWebhookSecret,
} from "@/lib/telegram/config";
import { getTelegramHelpText, parseTelegramCommand } from "@/lib/telegram/commands";
import { formatSearchResults, searchResearchDataset } from "@/lib/server/telegram-search";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat: {
      id: number;
    };
  };
};

async function sendTelegramMessage(chatId: number, text: string) {
  const token = getTelegramBotToken();

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function callInternalIngest(
  request: Request,
  path: string,
  payload: Record<string, unknown>,
) {
  const token = process.env.ASSISTANT_INGEST_TOKEN;
  if (!token) {
    throw new Error("ASSISTANT_INGEST_TOKEN is missing.");
  }

  const url = new URL(path, request.url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error || "Internal ingest failed.");
  }
}

function isAllowedChat(chatId: number) {
  const allowed = getTelegramAllowedChatIds();
  return allowed.length === 0 ? true : allowed.includes(String(chatId));
}

export async function POST(request: Request) {
  const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");

  try {
    if (incomingSecret !== getTelegramWebhookSecret()) {
      return NextResponse.json({ error: "Unauthorized telegram webhook." }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook secret is missing." },
      { status: 500 },
    );
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const chatId = message.chat.id;
  if (!isAllowedChat(chatId)) {
    await sendTelegramMessage(chatId, "허용되지 않은 채팅입니다.");
    return NextResponse.json({ ok: true, denied: true });
  }

  const parsed = parseTelegramCommand(message.text);
  if (!parsed.ok) {
    await sendTelegramMessage(chatId, `${parsed.message}\n\n${getTelegramHelpText()}`);
    return NextResponse.json({ ok: true, parseError: true });
  }

  try {
    if (parsed.command.kind === "help") {
      await sendTelegramMessage(chatId, getTelegramHelpText());
      return NextResponse.json({ ok: true });
    }

    if (parsed.command.kind === "search") {
      const results = await searchResearchDataset(
        createServiceRoleSupabaseClient(),
        parsed.command.scope,
        parsed.command.query,
      );
      await sendTelegramMessage(
        chatId,
        formatSearchResults(
          parsed.command.scope,
          parsed.command.query,
          results.map((entry) => entry.line),
        ),
      );
      return NextResponse.json({ ok: true });
    }

    if (parsed.command.kind === "news") {
      await callInternalIngest(request, "/api/internal/ingest/news", parsed.command.payload);
      await sendTelegramMessage(chatId, "뉴스 또는 투자 아이디어 저장을 완료했습니다.");
      return NextResponse.json({ ok: true });
    }

    if (parsed.command.kind === "followup") {
      await callInternalIngest(request, "/api/internal/ingest/follow-ups", parsed.command.payload);
      await sendTelegramMessage(chatId, "팔로업 업데이트를 완료했습니다.");
      return NextResponse.json({ ok: true });
    }

    if (parsed.command.kind === "portfolio") {
      await callInternalIngest(request, "/api/internal/ingest/portfolio", parsed.command.payload);
      await sendTelegramMessage(chatId, "포트폴리오 또는 관심종목 작업을 완료했습니다.");
      return NextResponse.json({ ok: true });
    }

    if (parsed.command.kind === "ticker") {
      await callInternalIngest(request, "/api/internal/ingest/tickers", parsed.command.payload);
      await sendTelegramMessage(chatId, "티커 저장 작업을 완료했습니다.");
      return NextResponse.json({ ok: true });
    }

    await callInternalIngest(request, "/api/internal/ingest/themes", parsed.command.payload);
    await sendTelegramMessage(chatId, "테마 저장 작업을 완료했습니다.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "창세봇 작업 처리 중 오류가 발생했습니다.";
    await sendTelegramMessage(chatId, `작업 실패: ${messageText}`);
    return NextResponse.json({ ok: false, error: messageText }, { status: 500 });
  }
}
