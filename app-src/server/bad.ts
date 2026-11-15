/** Ошибка, которую можно показать гостю как есть: текст, HTTP-статус и поле формы. */
export class Bad extends Error {
  status: number;
  field?: string;
  constructor(message: string, status = 400, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}
