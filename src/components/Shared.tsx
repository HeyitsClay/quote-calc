import * as React from "react";
import * as Ariakit from "@ariakit/react";

interface ButtonProps extends Ariakit.ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <Ariakit.Button
        ref={ref}
        className={`btn btn-${variant} btn-${size} ${className || ""}`}
        {...props}
      />
    );
  }
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  prefix?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className, prefix, containerClassName, ...props }, ref) => {
    return (
      <div className={`field-group ${containerClassName || ""}`}>
        {label && (
          <label htmlFor={id} className="field-label">
            {label}
          </label>
        )}
        <div className="input-container">
          {prefix && <span className="input-prefix">{prefix}</span>}
          <input
            ref={ref}
            id={id}
            className={`input-field ${prefix ? "has-prefix" : ""} ${className || ""}`}
            {...props}
          />
        </div>
      </div>
    );
  }
);

export const Card = ({ children, title, className, actions }: { 
  children: React.ReactNode; 
  title?: string; 
  className?: string;
  actions?: React.ReactNode;
}) => (
  <section className={`card ${className || ""}`}>
    {title && (
      <div className="card-header">
        <h3>{title}</h3>
        {actions && <div className="card-actions">{actions}</div>}
      </div>
    )}
    <div className="card-body">{children}</div>
  </section>
);

export const Toast = ({ message, type = "success" }: { message: string; type?: "success" | "error" }) => (
  <div className={`toast toast-${type}`}>{message}</div>
);
