/**
 * Telegram notification helper for NATAN
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export async function sendTelegramShiftAlert(
  config: TelegramConfig,
  shiftData: {
    city: string;
    district: string;
    storeName?: string;
    totalPay: number;
    startTime: string;
    endTime: string;
    durationHours: number;
    responseTimeMs?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled || !config.botToken || !config.chatId) {
    return { success: false, error: 'Telegram alerts not configured or disabled' };
  }

  const message = [
    `⚡ <b>تم اقتناص شفت نينجا جديد عبر NATAN!</b> 🎯`,
    ``,
    `📍 <b>المدينة:</b> ${shiftData.city}`,
    `🏢 <b>الفرع:</b> ${shiftData.district} ${shiftData.storeName ? `(${shiftData.storeName})` : ''}`,
    `⏰ <b>الوقت:</b> ${shiftData.startTime} - ${shiftData.endTime} (${shiftData.durationHours} ساعات)`,
    `💰 <b>المكافأة:</b> ${shiftData.totalPay} ريال سعودي`,
    shiftData.responseTimeMs ? `🚀 <b>سرعة الحجز:</b> ${shiftData.responseTimeMs}ms` : '',
    ``,
    `✅ <i>تم الحجز بنجاح ومزامنته مع تطبيق نينجا.</i>`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(config.botToken)}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    const resJson = await response.json();
    if (!resJson.ok) {
      return { success: false, error: resJson.description || 'Unknown Telegram API error' };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error reaching Telegram',
    };
  }
}

export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken.trim() || !chatId.trim()) {
    return { success: false, error: 'يرجى إدخال Bot Token و Chat ID أولاً' };
  }

  const text = `🔔 <b>اختبار إشعارات NATAN v4.1 بنجاح!</b>\n\nبوت نينجا متصل وجاهز لإرسال تنبيهات الشفتات المقتنصة فورياً.`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Telegram API returned an error' };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'فشل الاتصال بخادم تيليجرام',
    };
  }
}
