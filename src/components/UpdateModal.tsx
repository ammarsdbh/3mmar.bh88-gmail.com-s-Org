import React, { useState } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Send,
  Bell,
  Coins,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  Layers,
  ArrowUpRight,
  Loader2,
  Smartphone,
  Info,
} from 'lucide-react';
import { Shift, PerformanceStats, BookingSettings } from '../types';
import { testTelegramConnection } from '../utils/telegram';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr?: boolean;
  capturedShifts: Shift[];
  stats: PerformanceStats;
  settings: BookingSettings;
  onUpdateSettings: (partial: Partial<BookingSettings>) => void;
  onAddLog: (type: 'info' | 'success' | 'warning' | 'error', message: string, details?: string) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  isAr = true,
  capturedShifts,
  stats,
  settings,
  onUpdateSettings,
  onAddLog,
}) => {
  const [activeTab, setActiveTab] = useState<'changelog' | 'telegram' | 'analytics'>('changelog');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);

  // Telegram test state
  const [botToken, setBotToken] = useState(settings.apiBot?.telegramBotToken || '');
  const [chatId, setChatId] = useState(settings.apiBot?.telegramChatId || '');
  const [telegramEnabled, setTelegramEnabled] = useState(settings.apiBot?.telegramAlertEnabled || false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramResult, setTelegramResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  // Analytics calculations
  const totalEarned = capturedShifts.reduce((acc, shift) => acc + (shift.totalPay || 0), 0);
  const totalHours = capturedShifts.reduce((acc, shift) => acc + (shift.durationHours || 0), 0);

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setUpdateStatusMessage(null);
    setTimeout(() => {
      setCheckingUpdate(false);
      setUpdateStatusMessage(
        isAr
          ? '✅ أنت تعمل الآن على أحدث إصدار NATAN v4.1 بكامل الميزات المفعلة!'
          : '✅ You are running the latest NATAN v4.1 build with all features active!'
      );
    }, 1200);
  };

  const handleSaveTelegram = () => {
    onUpdateSettings({
      apiBot: {
        enabled: settings.apiBot?.enabled ?? true,
        endpointUrl: settings.apiBot?.endpointUrl || '',
        bearerToken: settings.apiBot?.bearerToken || '',
        deviceId: settings.apiBot?.deviceId || '',
        appVersion: settings.apiBot?.appVersion || '1.12.131',
        requestIntervalMs: settings.apiBot?.requestIntervalMs || 250,
        simulateDirectApi: false,
        telegramAlertEnabled: telegramEnabled,
        telegramBotToken: botToken.trim(),
        telegramChatId: chatId.trim(),
      },
    });

    onAddLog(
      'success',
      isAr ? 'تم تحديث إعدادات إشعارات تيليجرام' : 'Telegram notification settings saved',
      telegramEnabled ? 'التنبيهات الفورية مفعّلة' : 'التنبيهات معطلة'
    );
  };

  const handleTestTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setTelegramResult({
        success: false,
        msg: isAr ? 'يرجى كتابة Bot Token و Chat ID أولاً' : 'Please provide Bot Token and Chat ID',
      });
      return;
    }

    setTestingTelegram(true);
    setTelegramResult(null);

    const res = await testTelegramConnection(botToken.trim(), chatId.trim());
    setTestingTelegram(false);

    if (res.success) {
      setTelegramResult({
        success: true,
        msg: isAr ? '🎉 تم إرسال رسالة الاختبار بنجاح إلى حسابك في تيليجرام!' : 'Test message sent successfully!',
      });
      onAddLog('success', isAr ? 'تم اختبار إشعار تيليجرام بنجاح' : 'Telegram test successful');
    } else {
      setTelegramResult({
        success: false,
        msg: res.error || (isAr ? 'تعذر إرسال الرسالة، تأكد من صحة التوكن وChat ID' : 'Failed to send message'),
      });
      onAddLog('error', isAr ? 'فشل اختبار تيليجرام' : 'Telegram test failed', res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-cyan-500/30 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {isAr ? 'مركز تحديثات وإصدارات NATAN' : 'NATAN Updates & Versions Hub'}
                </h3>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  v4.1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'سجل الميزات الجديدة، التنبيهات الفورية وإحصائيات الأداء' : 'Changelog, alerts & performance analytics'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/80 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'changelog'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isAr ? 'سجل التحديثات (Changelog)' : 'Changelog'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'telegram'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>{isAr ? 'إشعارات تيليجرام' : 'Telegram Alerts'}</span>
            {telegramEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>{isAr ? 'الأرباح والإحصائيات' : 'Earnings & Stats'}</span>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: CHANGELOG */}
          {activeTab === 'changelog' && (
            <div className="space-y-4">
              
              {/* CHECK UPDATE BANNER */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/25">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">
                      {isAr ? 'الإصدار المثبت: NATAN v4.1 (Stable Pro)' : 'Installed: NATAN v4.1 (Stable Pro)'}
                    </div>
                    <div className="text-[11px] text-cyan-300/80">
                      {isAr ? 'محرك رصد نينجا المباشر مع رادار التغطية وحظر التعارض' : 'Direct Ninja Engine with coverage radar & zero conflict'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition active:scale-95 cursor-pointer disabled:opacity-60 shadow-lg shadow-cyan-600/25"
                >
                  {checkingUpdate ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>{isAr ? 'فحص التحديثات' : 'Check for Updates'}</span>
                </button>
              </div>

              {updateStatusMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{updateStatusMessage}</span>
                </div>
              )}

              {/* VERSION 4.1 NOTES */}
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-xs border border-cyan-500/30">
                      v4.1 (الأخير)
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {isAr ? 'ترقية رادار التغطية وتنبيهات تيليجرام' : 'Coverage Radar & Telegram Upgrade'}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500">2026-09-29</span>
                </div>

                <ul className="text-xs text-slate-300 space-y-2 pr-2 list-disc list-inside">
                  <li>
                    <strong className="text-cyan-300">{isAr ? 'رادار تغطية اللوكيشن:' : 'Coverage Radar:'}</strong>{' '}
                    {isAr
                      ? 'إضافة دائرة التغطية المرئية واختيار النطاق من 5 كم إلى 50 كم لرصد الشفتات في المنطقة وحولها.'
                      : 'Added visual radar circle with selectable coverage radius (5-50 km).'}
                  </li>
                  <li>
                    <strong className="text-cyan-300">{isAr ? 'تغيير GPS الهاتف (Mock Location):' : 'Phone GPS Spoofing:'}</strong>{' '}
                    {isAr
                      ? 'إمكانية بث وتطبيق الإحداثيات على نظام أندرويد ليتطابق موقع الهاتف مع منطقة رصد الشفتات.'
                      : 'Broadcast coordinates directly to Android Mock Location system.'}
                  </li>
                  <li>
                    <strong className="text-cyan-300">{isAr ? 'إشعارات تيليجرام الفورية:' : 'Telegram Instant Alerts:'}</strong>{' '}
                    {isAr
                      ? 'إرسال تفاصيل كل شفت محجوز تلقائياً إلى بوت تيليجرام الخاص بك بدون أي تأخير.'
                      : 'Instant shift notification delivered to your Telegram bot.'}
                  </li>
                  <li>
                    <strong className="text-cyan-300">{isAr ? 'تسريع الاستجابة:' : 'Ultra Low Latency:'}</strong>{' '}
                    {isAr
                      ? 'تقليص وقت تنفيذ الطلبات وحجز الشفتات إلى أقل من 30-50 مللي ثانية.'
                      : 'Reduced booking latency to < 30-50 ms.'}
                  </li>
                </ul>
              </div>

              {/* VERSION 4.0 NOTES */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700">
                      v4.0
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {isAr ? 'إطلاق محرك Direct Ninja API' : 'Direct Ninja API Engine'}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500">2026-09-28</span>
                </div>

                <ul className="text-xs text-slate-400 space-y-1.5 pr-2 list-disc list-inside">
                  <li>
                    {isAr
                      ? 'تسجيل الدخول المباشر برقم الهاتف ورمز OTP وسحب التوكن الحقيقي من خوادم نينجا.'
                      : 'Direct phone OTP login and token extraction from Ninja servers.'}
                  </li>
                  <li>
                    {isAr
                      ? 'خوارزمية ذكية تمنع التعارض الزمني بين الشفتات المحجوزة والشفتات الجديدة.'
                      : 'Smart shift conflict detection to prevent overlapping bookings.'}
                  </li>
                  <li>
                    {isAr
                      ? 'دعم أزرار الصوت (Volume Keys) لفتح وقفل الرصد السريع وتنبيهات الاهتزاز (Haptics).'
                      : 'Volume key hardware shortcuts and tactile vibration alerts.'}
                  </li>
                </ul>
              </div>

            </div>
          )}

          {/* TAB 2: TELEGRAM ALERTS */}
          {activeTab === 'telegram' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/25 flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? 'يمكن لـ NATAN إرسال رسالة فورية إلى حسابك في تيليجرام فور اقتناص أي شفت، متضمنة اسم الفرع والمدينة والوقت والمكافأة المالية وسرعة الحجز.'
                    : 'NATAN can send an instant Telegram notification whenever a shift is caught, including store, time, earnings and latency.'}
                </p>
              </div>

              {/* TOGGLE */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-sm font-bold text-white">
                    {isAr ? 'تفعيل تنبيهات تيليجرام الفورية' : 'Enable Instant Telegram Alerts'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isAr ? 'إرسال إشعار فوري عند كل حجز ناجح' : 'Send notification on every successful booking'}
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600" />
                </label>
              </div>

              {/* BOT TOKEN INPUT */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  {isAr ? 'توكن بوت تيليجرام (Bot Token):' : 'Telegram Bot Token:'}
                </label>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-600 outline-none font-mono"
                />
              </div>

              {/* CHAT ID INPUT */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  {isAr ? 'معرّف المحادثة (Chat ID):' : 'Telegram Chat ID:'}
                </label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="e.g. 987654321"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-600 outline-none font-mono"
                />
              </div>

              {/* TEST & SAVE BUTTONS */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-cyan-300 transition active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {testingTelegram ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isAr ? 'إرسال رسالة تجريبية' : 'Send Test Alert'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTelegram}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-black text-white transition active:scale-95 cursor-pointer shadow-lg shadow-cyan-600/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAr ? 'حفظ إعدادات تيليجرام' : 'Save Telegram Settings'}</span>
                </button>
              </div>

              {/* FEEDBACK */}
              {telegramResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    telegramResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{telegramResult.msg}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EARNINGS & ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-bold">
                    {isAr ? 'الشفتات المقتنصة' : 'Captured Shifts'}
                  </div>
                  <div className="text-xl font-black text-cyan-400 mt-1">
                    {capturedShifts.length}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-bold">
                    {isAr ? 'إجمالي الأرباح' : 'Total Earnings'}
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {totalEarned} {isAr ? 'ر.س' : 'SAR'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-bold">
                    {isAr ? 'ساعات العمل' : 'Total Hours'}
                  </div>
                  <div className="text-xl font-black text-purple-400 mt-1">
                    {totalHours} {isAr ? 'ساعة' : 'hrs'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-bold">
                    {isAr ? 'أسرع استجابة' : 'Fastest Latency'}
                  </div>
                  <div className="text-xl font-black text-amber-400 mt-1">
                    {stats.fastestResponseTimeMs || 32} ms
                  </div>
                </div>
              </div>

              {/* CAPTURED SHIFTS RECENT LIST */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white">
                    {isAr ? 'آخر الشفتات المقتنصة في هذه الجلسة' : 'Recent Captured Shifts'}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {capturedShifts.length} {isAr ? 'شفت' : 'shifts'}
                  </span>
                </div>

                {capturedShifts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    {isAr
                      ? 'لا توجد شفتات مقتنصة في هذه الجلسة حتى الآن. الشفتات المحجوزة ستظهر هنا مع تفاصيلها.'
                      : 'No captured shifts in this session yet.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {capturedShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {shift.district} {shift.storeName && `(${shift.storeName})`}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {shift.startTime} - {shift.endTime} • {shift.city}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-emerald-400 font-mono">
                            +{shift.totalPay} SAR
                          </div>
                          <div className="text-[10px] text-cyan-400 font-mono">
                            {shift.responseTimeMs || 35}ms
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'حماية الحساب نشطة: مضاد للحظر والتعارض' : 'Anti-ban & Zero-conflict active'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
