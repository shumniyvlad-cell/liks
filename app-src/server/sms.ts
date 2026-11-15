import {Bad} from './bad';

// СМС с кодом входа. Провайдер выбирается в окружении: SMS_PROVIDER=smsru и SMSRU_API_ID.
// Пока сервис не подключён, сервер работает с AUTH_TEST=1 и СМС не шлёт.

export async function sendSms(phone: string, text: string) {
  const provider = process.env.SMS_PROVIDER ?? '';
  if (provider === 'smsru') {
    const id = process.env.SMSRU_API_ID ?? '';
    const to = phone.replace(/\D/g, '');
    const url = `https://sms.ru/sms/send?api_id=${encodeURIComponent(id)}&to=${to}&msg=${encodeURIComponent(text)}&json=1`;
    const r = (await fetch(url, {signal: AbortSignal.timeout(10e3)}).then((x) => x.json()).catch(() => null)) as
      | {status?: string; sms?: Record<string, {status?: string; status_text?: string}>}
      | null;
    if (r?.status === 'OK' && r.sms?.[to]?.status === 'OK') return;
    console.error('sms.ru', JSON.stringify(r));
  } else console.error('СМС не настроены: SMS_PROVIDER пуст');
  throw new Bad('Не получилось отправить СМС. Попробуйте через минуту.', 502);
}
