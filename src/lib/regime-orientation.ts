/** Limited orientation: a missing answer never establishes eligibility. */
export type OrientationAnswers = {
  activity?: 'services'|'goods'|'home'|'nonresidential'|'rental_unknown'|'resale';
  employees?: 'yes'|'no';
  income?: 'within'|'above'|'large';
  restriction?: 'none'|'excluded'|'employer'|'unknown';
};
export function orientRegime(a:OrientationAnswers) {
  if (!a.activity || !a.employees || !a.income || !a.restriction) return {status:'unknown',title:'Пока недостаточно данных',reason:'Ответьте на вопросы. Пропущенный ответ не означает, что НПД подходит.'};
  if(a.activity==='nonresidential') return {status:'excluded',title:'НПД не подходит для этой аренды',reason:'Доход от аренды нежилого помещения не относится к доходам, облагаемым НПД. Другой порядок налогообложения нужно проверить отдельно.'};
  if(a.activity==='rental_unknown') return {status:'unknown',title:'Сначала уточните статус помещения',reason:'Для этой проверки нужно знать, жилое ли помещение. Проверьте сведения об объекте в ЕГРН. Без этого рекомендовать НПД нельзя.'};
  if(a.restriction==='employer') return {status:'excluded',title:'Эта оплата не облагается НПД',reason:'Доход за услуги или работы от текущего работодателя либо бывшего менее двух лет назад не относится к объекту НПД. Это не общий запрет сотрудничества: порядок оформления нужно уточнить отдельно.'};
  if(a.restriction==='unknown') return {status:'unknown',title:'Нужна проверка ограничений',reason:'Ответов пока недостаточно для выбора режима. Уточните ограничения по деятельности и действующему налоговому режиму в ФНС.'};
  if(a.activity==='resale'||a.employees==='yes'||a.income!=='within'||a.restriction==='excluded') return {status:'excluded',title:'Нужен отдельный выбор режима',reason:'В ответах есть условие, которое не позволяет предложить НПД. УСН автоматически не рекомендуем: нужно проверить вид деятельности, регион, доход, сотрудников и НДС.'};
  return {status:'limited',title:'Можно рассмотреть НПД',reason:'По вашим ответам базовые условия совпали. Это первичная ориентация, а не подтверждение права применять режим.'};
}
