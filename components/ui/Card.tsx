import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds hairline crosshair marks (`+`) at the four corners — blueprint accent, see globals.css. */
  marks?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, marks, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-zinc-100 backdrop-blur-md transition-all duration-200 hover:border-zinc-700 hover:-translate-y-px",
        marks && "relative group-marks",
        className
      )}
      {...props}
    >
      {marks && (
        <>
          <span className="corner-mark -left-[5px] -top-[5px]" aria-hidden="true" />
          <span className="corner-mark -right-[5px] -top-[5px]" aria-hidden="true" />
          <span className="corner-mark -bottom-[5px] -left-[5px]" aria-hidden="true" />
          <span className="corner-mark -bottom-[5px] -right-[5px]" aria-hidden="true" />
        </>
      )}
      {children}
    </div>
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold leading-tight tracking-normal text-zinc-100",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-zinc-400 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
