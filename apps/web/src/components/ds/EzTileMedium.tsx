import { HTMLAttributes, forwardRef, CSSProperties } from 'react';
import { cn } from './utils';
import { EzAvatar } from './EzAvatar';
import { EzTag } from './EzTag';
import { EzButton } from './EzButton';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface EzTileMediumAvatarProps {
  name?: string;
  imageSrc?: string;
  shape?: 'circle' | 'square';
}

export interface EzTileMediumTag {
  label: string;
  /** Color variant, mapped to EzTag variants. @default 'ocean' */
  color?: 'ocean' | 'gray' | 'green' | 'yellow' | 'red' | 'petroleum' | 'outline';
}

export interface EzTileMediumButtonProps {
  label: string;
  onClick: () => void;
  enabled?: boolean;
}

export interface EzTileMediumProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  /** Small title text, max 1 line by default. */
  smallTitleText?: string;
  /** Maximum number of lines for the small title. @default 1 */
  smallTitleMaximumLines?: number;
  /** Description paragraph text, max 3 lines by default. */
  descriptionText?: string;
  /** Maximum number of lines for the description. @default 3 */
  descriptionMaximumLines?: number;
  /** Icon name from the icon library (kebab/camel/snake accepted, e.g. "user"), shown top-left. Ignored when avatarProps is set. */
  iconName?: string;
  /** Custom color for the icon (any valid CSS color/class is accepted as inline style color). */
  iconColor?: string;
  /** When set, renders an EzAvatar instead of the icon, top-left. */
  avatarProps?: EzTileMediumAvatarProps;
  /** Up to 3 tags rendered top-right. */
  tags?: EzTileMediumTag[];
  /** When set, renders an EzButton in the footer. */
  buttonProps?: EzTileMediumButtonProps;
  /** Theme color of the card. @default 'default' */
  color?: 'default' | 'gray' | 'green' | 'red' | 'yellow';
  /** Custom height, overrides the 257px default. */
  height?: string;
  /** Custom width, overrides the 446px default. */
  width?: string;
}

const COLOR_CLASSES: Record<NonNullable<EzTileMediumProps['color']>, string> = {
  default: 'bg-white border-gray-200',
  gray: 'bg-gray-50 border-gray-200',
  green: 'bg-green-50 border-green-200',
  red: 'bg-red-50 border-red-200',
  yellow: 'bg-yellow-50 border-yellow-200',
};

/**
 * Aponta DS Tile Medium
 * Read-only or interactive card with optional icon/avatar, up to 3 tags,
 * title, description and an optional action button.
 * Mirrors Sankhya DS `ez-tile-medium`.
 */
export const EzTileMedium = forwardRef<HTMLDivElement, EzTileMediumProps>(
  (
    {
      smallTitleText,
      smallTitleMaximumLines = 1,
      descriptionText,
      descriptionMaximumLines = 3,
      iconName,
      iconColor,
      avatarProps,
      tags,
      buttonProps,
      color = 'default',
      height,
      width,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const resolvedIconKey = iconName
      ? ((iconName
          .split(/[-_\s]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('')) as keyof typeof Icons)
      : undefined;
    const Icon = resolvedIconKey ? (Icons[resolvedIconKey] as LucideIcon | undefined) : undefined;
    const visibleTags = (tags ?? []).slice(0, 3);

    const clampStyle = (lines: number): CSSProperties => ({
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: lines,
      overflow: 'hidden',
    });

    return (
      <div
        ref={ref}
        style={{
          height: height ?? '257px',
          width: width ?? '446px',
          ...style,
        }}
        className={cn(
          'flex flex-col justify-between rounded-[12px] border p-4 gap-3',
          COLOR_CLASSES[color],
          className
        )}
        {...props}
      >
        {/* Header: icon/avatar (left) + up to 3 tags (right) */}
        {(avatarProps || Icon || visibleTags.length > 0) && (
          <div className="flex items-start justify-between gap-2">
            <div>
              {avatarProps ? (
                <EzAvatar
                  name={avatarProps.name}
                  src={avatarProps.imageSrc}
                  shape={avatarProps.shape ?? 'circle'}
                  size={40}
                />
              ) : Icon ? (
                <Icon
                  data-testid="ez-tile-medium-icon"
                  className="w-6 h-6"
                  style={iconColor ? { color: iconColor } : undefined}
                />
              ) : null}
            </div>

            {visibleTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {visibleTags.map((tag, idx) => (
                  <EzTag key={`${tag.label}-${idx}`} label={tag.label} variant={tag.color ?? 'ocean'} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Body: small title + description */}
        <div className="flex flex-col gap-1 flex-1">
          {smallTitleText && (
            <span
              className="text-[14px] font-semibold text-gray-900"
              style={clampStyle(smallTitleMaximumLines)}
            >
              {smallTitleText}
            </span>
          )}
          {descriptionText && (
            <span
              className="text-[13px] text-gray-500"
              style={clampStyle(descriptionMaximumLines)}
            >
              {descriptionText}
            </span>
          )}
        </div>

        {/* Footer: optional action button */}
        {buttonProps && (
          <div className="flex justify-end">
            <EzButton
              variant="tertiary"
              size="small"
              label={buttonProps.label}
              disabled={buttonProps.enabled === false}
              onClick={buttonProps.onClick}
            />
          </div>
        )}
      </div>
    );
  }
);

EzTileMedium.displayName = 'EzTileMedium';
