import { useTranslation } from 'react-i18next'
import { useBeginnerMode } from '../../contexts/BeginnerModeContext'

const STAT_COLORS = {
  added: { color: '#34C759', bg: 'bg-green-100', text: 'text-green-700' },
  removed: { color: '#FF3B30', bg: 'bg-red-100', text: 'text-red-700' },
  attribute_changed: { color: '#FF9500', bg: 'bg-orange-100', text: 'text-orange-700' },
  text_changed: { color: '#007AFF', bg: 'bg-blue-100', text: 'text-blue-700' },
}

export default function DiffStatsChart({ domDiff }) {
  const { t } = useTranslation()
  const { isBeginner } = useBeginnerMode()

  if (!domDiff) return null

  const stats = {
    added: domDiff.added_elements?.length || 0,
    removed: domDiff.removed_elements?.length || 0,
    attribute_changed: domDiff.attribute_changes?.length || 0,
    text_changed: domDiff.text_changes?.length || 0,
  }

  const total = Object.values(stats).reduce((sum, val) => sum + val, 0)

  if (total === 0) return null

  const maxCount = Math.max(...Object.values(stats))

  const getLabel = (key) => {
    if (isBeginner) {
      const map = {
        added: t('beginner_mode.added_elements'),
        removed: t('beginner_mode.removed_elements'),
        attribute_changed: t('beginner_mode.attribute_changes'),
        text_changed: t('beginner_mode.text_changes'),
      }
      return map[key]
    }
    const map = {
      added: t('dom_diff.filter_added'),
      removed: t('dom_diff.filter_removed'),
      attribute_changed: t('dom_diff.filter_changed'),
      text_changed: t('dom_diff.filter_text'),
    }
    return map[key]
  }

  return (
    <div className="card-apple p-5">
      <h3 className="text-[15px] font-semibold tracking-tight text-apple-gray-900 dark:text-apple-gray-100 mb-4">
        {t('stats.dom_distribution')}
      </h3>

      <div className="space-y-3">
        {Object.entries(stats).map(([key, count]) => {
          if (count === 0) return null
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
          const config = STAT_COLORS[key]

          return (
            <div key={key} className="flex items-center gap-3">
              <span className={`text-[12px] font-medium w-24 truncate ${config.text}`}>
                {getLabel(key)}
              </span>
              <div className="flex-1 h-6 bg-apple-gray-100 dark:bg-apple-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-apple-spring"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
              <span className="text-[13px] font-bold w-10 text-right" style={{ color: config.color }}>
                {count}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-apple-gray-100 dark:border-apple-gray-700">
        <div className="flex items-center justify-between text-[12px] text-apple-gray-500">
          <span>{t('stats.total_changes')}</span>
          <span className="font-bold text-apple-gray-700 dark:text-apple-gray-300">{total}</span>
        </div>
      </div>
      {isBeginner && (
        <p className="mt-3 text-[10px] text-apple-blue/70 leading-relaxed">{t('beginner_mode.hint_stats_chart')}</p>
      )}
    </div>
  )
}
