export function HeaderIconButton({ label, children, onClick }) {
    return (<button type="button" className="HeaderIconButton HeaderIconButton__button-1 grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground" title={label} aria-label={label} onClick={onClick}>
      {children}
    </button>);
}
