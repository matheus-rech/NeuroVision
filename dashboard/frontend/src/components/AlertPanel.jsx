import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Trash2,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * Priority configuration for alerts
 */
const PRIORITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    dotColor: 'bg-red-500',
    label: 'CRITICAL',
    animate: 'alert-critical',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    label: 'WARNING',
    animate: 'alert-warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    dotColor: 'bg-blue-500',
    label: 'INFO',
    animate: '',
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    label: 'SUCCESS',
    animate: '',
  },
};

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Time elapsed since alert
 */
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/**
 * Individual alert item component
 */
function AlertItem({ alert, onAcknowledge, compact = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={`
        relative p-3 rounded-lg border transition-all duration-200
        ${config.bgColor} ${config.borderColor}
        ${alert.acknowledged ? 'opacity-50' : config.animate}
        ${compact ? 'py-2' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
          <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${config.color}`}>
              {config.label}
            </span>
            {alert.source && (
              <span className="text-xs text-gray-500">
                {alert.source}
              </span>
            )}
          </div>

          <p className={`text-gray-200 ${compact ? 'text-sm' : ''} ${
            !isExpanded && alert.message.length > 80 ? 'truncate' : ''
          }`}>
            {alert.message}
          </p>

          {alert.message.length > 80 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-500 hover:text-gray-300 mt-1 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> More
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{formatTimestamp(alert.timestamp)}</span>
            <span>{getTimeAgo(alert.timestamp)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Acknowledge"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Priority dot indicator */}
      {!alert.acknowledged && (
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${config.dotColor}`} />
      )}
    </div>
  );
}

/**
 * Alert Panel component - displays scrolling list of alerts
 */
export function AlertPanel({
  alerts = [],
  onAcknowledge,
  onClearAll,
  maxVisible = 10,
  compact = false,
  showFilters = true,
  className = '',
  role = 'surgeon',
}) {
  const [filter, setFilter] = useState('all');
  const [showMuted, setShowMuted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const prevAlertsLength = useRef(alerts.length);

  // Auto-scroll to top on new alert
  useEffect(() => {
    if (alerts.length > prevAlertsLength.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevAlertsLength.current = alerts.length;
  }, [alerts.length]);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.acknowledged;
    return alert.priority === filter;
  });

  // Sort by timestamp (newest first)
  const sortedAlerts = [...filteredAlerts].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Limit visible alerts
  const visibleAlerts = sortedAlerts.slice(0, maxVisible);
  const unreadCount = alerts.filter(a => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.priority === 'critical' && !a.acknowledged).length;

  return (
    <div className={`flex flex-col bg-gray-900/50 rounded-lg border border-gray-800 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-white font-medium"
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
          </button>

          {/* Badge */}
          {unreadCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              criticalCount > 0 ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-200'
            }`}>
              {unreadCount}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 overflow-x-auto">
              {[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
                { value: 'critical', label: 'Critical' },
                { value: 'warning', label: 'Warning' },
                { value: 'info', label: 'Info' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === value
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Alert list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
            style={{ maxHeight: compact ? '200px' : '400px' }}
          >
            {visibleAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No alerts</p>
                <p className="text-xs mt-1">System is operating normally</p>
              </div>
            ) : (
              visibleAlerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  compact={compact}
                />
              ))
            )}

            {/* More indicator */}
            {sortedAlerts.length > maxVisible && (
              <div className="text-center py-2 text-xs text-gray-500">
                +{sortedAlerts.length - maxVisible} more alerts
              </div>
            )}
          </div>
        </>
      )}

      {/* Collapsed summary */}
      {isCollapsed && unreadCount > 0 && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-4 text-xs">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {criticalCount} critical
              </span>
            )}
            {alerts.filter(a => a.priority === 'warning' && !a.acknowledged).length > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                {alerts.filter(a => a.priority === 'warning' && !a.acknowledged).length} warning
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertPanel;
