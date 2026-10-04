import { HTMLAttributes, forwardRef, useMemo } from 'react';
import { cn } from './utils';

export interface EzAvatarProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The name of the user (used for initials).
   */
  name?: string;
  /**
   * Complete image URL to display. Overrides the initials.
   */
  src?: string;
  /**
   * The shape of the avatar.
   * @default 'circle'
   */
  shape?: 'circle' | 'square';
  /**
   * The size defining width and height in pixels.
   * @default 40
   */
  size?: number;
}

/**
 * Aponta DS Avatar
 * Renders an image or the initials of a user.
 */
export const EzAvatar = forwardRef<HTMLDivElement, EzAvatarProps>(
  ({ name = '', src, shape = 'circle', size = 40, className, style, ...props }, ref) => {
    // Extract initials (e.g., "João Silva" -> "JS")
    const initials = useMemo(() => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 0 || !parts[0]) return '?';
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [name]);

    return (
      <div
        ref={ref}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          fontSize: Math.max(10, size * 0.4),
          ...style,
        }}
        className={cn(
          'relative flex items-center justify-center overflow-hidden font-medium select-none',
          'bg-gray-100 text-gray-700 border border-gray-200 uppercase',
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          className
        )}
        title={name}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            className="object-cover w-full h-full"
            onError={(e) => {
              // Fallback to initials if image fails to load (hide the broken image)
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Render initials absolutely behind the image, or as the main content if no image */}
        <span className={cn('absolute z-0', src && 'opacity-0')}>{initials}</span>
      </div>
    );
  }
);

EzAvatar.displayName = 'EzAvatar';
