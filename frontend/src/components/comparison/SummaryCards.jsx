import { useTranslation } from 'react-i18next'
import { IconCode, IconEye, IconText } from '../shared/Icons'

function getSeverity(value, type) {
  if (type === 'visual') {
    if (value === 0) return { level: 'none', color: 'border-apple-green/30 bg-apple-green-light/40', textColor: 'text-apple-green', barColor: '#34C759', badge: 'no_changes' }
    if (value < 5) return { level: 'low', color: 'border-apple-orange/30 bg-apple-orange-light/30', textColor: 'text-apple-orange', barColor: '#FF9500', badge: 'minor' }
    if (value < 20) return { level: 'medium', color: 'border-apple-orange/40 bg-apple-orange-light/50', textColor: 'text-apple-orange', barColor: '#FF9500', badge: 'moderate' }
    return { level: 'high', color: 'border-apple-red/30 bg-apple-red-light/30', textColor: 'text-apple-red', barColor: '#FF3B30', badge: 'major' }
  }
  if (value === 0) return { level: 'none', color: 'border-apple-green/30 bg-apple-green-light/40', textColor: 'text-apple-green', barColor: '#34C759', badge: 'no_changes' }
  if (value < 10) return { level: 'low', color: 'border-apple-orange/30 bg-apple-orange-light/30', textColor: 'text-apple-orange', barColor: '#FF9500', badge: 'minor' }
  if (value < 50) return { level: 'medium', color: 'border-apple-orange/40 bg-apple-orange-light/50', textColor: 'text-apple-orange', barColor: '#FF9500', badge: 'moderate' }
  return { level: 'high', color: 'border-apple-red/30 bg-apple-red-light/30', textColor: 'text-apple-red', barColor: '#FF3B30', badge: 'major' }
}

export default function SummaryCards({ summary, similarity }) {
  const { t } = useTranslation()
  if (!summary) return null

  const domSev = getSeverity(summary.dom_diff_count, 'dom')
  const visSev = getSeverity(summary.visual_diff_percentage, 'visual')
  const txtSev = getSeverity(summary.text_diff_count, 'text')

  const cards = [
    {
      title: t('summary.dom_structure'), value: summary.dom_diff_count, unit: t('summary.differences'),
      severity: domSev, sectionId: 'dom-diff', Icon: IconCode,
      hint: summary.dom_diff_count === 0 ? t('summary.no_changes') : t('summary.changes_found'),
    },
    {
      title: t('summary.visual'), value: summary.visual_diff_percentage, unit: t('summary.percent_diff'),
      severity: visSev, sectionId: 'visual-diff', Icon: IconEye,
      hint: summary.visual_diff_percentage === 0 ? t('summary.no_changes') : t('summary.changes_found'),
    },
    {
      title: t('summary.text_content'), value: summary.text_diff_count, unit: t('summary.changes'),
      severity: txtSev, sectionId: 'text-diff', Icon: IconText,
      hint: summary.text_diff_count === 0 ? t('summary.no_changes') : t('summary.changes_found'),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ title, value, unit, severity, sectionId, Icon: CardIcon, hint }) => (
        <a
          key={sectionId}
          href={`#${sectionId}`}
          className={`card-lift rounded-2xl border-2 p-5 transition-all duration-300 ${severity.color} hover:shadow-apple-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${severity.level === 'none' ? 'bg-apple-green-light' : severity.level === 'high' ? 'bg-apple-red-light' : 'bg-apple-orange-light'}`}>
                <CardIcon className={`w-4 h-4 ${severity.textColor}`} />
              </div>
              <span className="text-[13px] font-semibold text-apple-gray-700">{title}</span>
            </div>
            <span className={`badge-apple ${severity.level === 'none' ? 'bg-apple-green-light text-apple-green' : severity.level === 'high' ? 'bg-apple-red-light text-apple-red' : 'bg-apple-orange-light text-apple-orange'}`}>
              {t(`summary.${severity.badge}`)}
            </span>
          </div>
          <p className={`text-3xl font-bold tracking-tight ${severity.textColor}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
            <span className="ml-1.5 text-[13px] font-normal opacity-70">{unit}</span>
          </p>
          {severity.level !== 'none' && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-apple-gray-200">
              <div className="h-full rounded-full transition-all duration-700 ease-apple-spring"
                style={{ width: `${Math.min(value / (severity.level === 'high' ? 100 : 50) * 100, 100)}%`, backgroundColor: severity.barColor }} />
            </div>
          )}
          <p className="mt-2 text-[11px] text-apple-gray-400">{hint}</p>
        </a>
      ))}
    </div>
  )
}
