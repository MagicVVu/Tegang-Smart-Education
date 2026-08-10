import {
  Fragment,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type DataListSize = "small" | "default" | "large";
type DataListLayout = "horizontal" | "vertical";

interface DataListProps<T>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  dataSource?: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemLayout?: DataListLayout;
  size?: DataListSize;
  emptyText?: ReactNode;
}

interface DataListItemProps extends HTMLAttributes<HTMLDivElement> {
  actions?: readonly ReactNode[];
}

interface DataListItemMetaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  avatar?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}

function getItemKey<T>(item: T, index: number) {
  if (typeof item === "object" && item !== null) {
    const record = item as Record<string, unknown>;
    const candidate = record.key ?? record.id;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
  }

  return index;
}

function DataListBase<T>({
  className,
  dataSource = [],
  emptyText = "暂无数据",
  itemLayout = "horizontal",
  renderItem,
  size = "default",
  ...rest
}: DataListProps<T>) {
  const classes = [
    "data-list",
    `data-list--${itemLayout}`,
    `data-list--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...rest} className={classes} role="list">
      {dataSource.length > 0 ? (
        dataSource.map((item, index) => (
          <Fragment key={getItemKey(item, index)}>
            {renderItem(item, index)}
          </Fragment>
        ))
      ) : (
        <div className="data-list__empty">{emptyText}</div>
      )}
    </div>
  );
}

function DataListItemMeta({
  avatar,
  className,
  description,
  title,
  ...rest
}: DataListItemMetaProps) {
  const classes = ["data-list__meta", className].filter(Boolean).join(" ");

  return (
    <div {...rest} className={classes}>
      {avatar ? <div className="data-list__meta-avatar">{avatar}</div> : null}
      <div className="data-list__meta-content">
        {title ? <div className="data-list__meta-title">{title}</div> : null}
        {description ? (
          <div className="data-list__meta-description">{description}</div>
        ) : null}
      </div>
    </div>
  );
}

function DataListItemBase({
  actions,
  children,
  className,
  onClick,
  onKeyDown,
  tabIndex,
  ...rest
}: DataListItemProps) {
  const classes = [
    "data-list__item",
    onClick ? "data-list__item--interactive" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (
      !event.defaultPrevented &&
      onClick &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <div
      {...rest}
      className={classes}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={onClick ? (tabIndex ?? 0) : tabIndex}
    >
      <div className="data-list__item-main">{children}</div>
      {actions?.length ? (
        <ul className="data-list__actions" aria-label="可用操作">
          {actions.map((action, index) => (
            <li key={index}>{action}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const DataListItem = Object.assign(DataListItemBase, {
  Meta: DataListItemMeta,
});

export const DataList = Object.assign(DataListBase, {
  Item: DataListItem,
});
