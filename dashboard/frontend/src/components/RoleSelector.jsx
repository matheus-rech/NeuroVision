import { useState, useRef, useEffect } from 'react';
import {
  User,
  Stethoscope,
  GraduationCap,
  ChevronDown,
  Check,
} from 'lucide-react';

/**
 * Role configuration
 */
const ROLES = {
  surgeon: {
    id: 'surgeon',
    label: 'Surgeon',
    description: 'Primary operator view',
    icon: Stethoscope,
    color: 'emerald',
    features: ['Large video feed', 'Critical alerts only', 'Minimal 3D'],
  },
  nurse: {
    id: 'nurse',
    label: 'Nurse',
    description: 'Support team view',
    icon: User,
    color: 'blue',
    features: ['Equal layout', 'All alerts', 'Inventory tracking'],
  },
  trainee: {
    id: 'trainee',
    label: 'Trainee',
    description: 'Educational view',
    icon: GraduationCap,
    color: 'purple',
    features: ['Full 3D model', 'Technique coaching', 'Step guidance'],
  },
};

/**
 * Role Selector dropdown component
 */
export function RoleSelector({
  currentRole = 'surgeon',
  onRoleChange,
  disabled = false,
  compact = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedRole = ROLES[currentRole] || ROLES.surgeon;
  const Icon = selectedRole.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle role selection
  const handleSelect = (roleId) => {
    if (roleId !== currentRole && onRoleChange) {
      onRoleChange(roleId);
    }
    setIsOpen(false);
  };

  // Color classes based on role
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      hover: 'hover:bg-emerald-500/30',
    },
    blue: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      hover: 'hover:bg-blue-500/30',
    },
    purple: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      hover: 'hover:bg-purple-500/30',
    },
  };

  const colors = colorClasses[selectedRole.color];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          ${colors.bg} ${colors.border} ${colors.text}
          ${disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${colors.hover}`}
          ${compact ? 'px-2 py-1.5' : ''}
        `}
      >
        <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        {!compact && (
          <>
            <span className="font-medium">{selectedRole.label}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2">
              Select View Mode
            </div>

            {Object.values(ROLES).map((role) => {
              const RoleIcon = role.icon;
              const roleColors = colorClasses[role.color];
              const isSelected = role.id === currentRole;

              return (
                <button
                  key={role.id}
                  onClick={() => handleSelect(role.id)}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left
                    ${isSelected ? roleColors.bg : 'hover:bg-gray-800'}
                  `}
                >
                  {/* Icon */}
                  <div className={`
                    p-2 rounded-lg flex-shrink-0
                    ${isSelected ? roleColors.bg : 'bg-gray-800'}
                  `}>
                    <RoleIcon className={`w-5 h-5 ${isSelected ? roleColors.text : 'text-gray-400'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? roleColors.text : 'text-white'}`}>
                        {role.label}
                      </span>
                      {isSelected && (
                        <Check className={`w-4 h-4 ${roleColors.text}`} />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.features.map((feature, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              View mode affects layout and information displayed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleSelector;
