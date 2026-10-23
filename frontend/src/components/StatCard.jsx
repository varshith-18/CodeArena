import "./StatCard.css";
export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = "blue",
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-title">{title}</span>
        <div className={`stat-icon stat-icon-${color}`}>
          <Icon size={20} />
        </div>
      </div>

      <div className="stat-value">{value}</div>
      <p className="stat-description">{description}</p>
    </article>
  );
}
