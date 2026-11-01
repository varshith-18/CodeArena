
import { useEffect, useMemo, useState } from "react";
import { Flame, CalendarDays, Trophy, Code2 } from "lucide-react";
import { getMyActivity } from "../api/activityApi";
import "./ActivityCalendar.css";

function getActivityLevel(count) {
  if (count === 0) return "level-0";
  if (count <= 2) return "level-1";
  if (count <= 5) return "level-2";
  if (count <= 9) return "level-3";
  return "level-4";
}

export default function ActivityCalendar() {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem("codearena_token");

        if (!token) {
          throw new Error("Please log in to view your activity.");
        }

        const data = await getMyActivity(token);

        if (!cancelled) {
          setActivity(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, []);

  const weeks = useMemo(() => {
    if (!activity?.dailyActivity) return [];

    const days = activity.dailyActivity.map((item) => ({
      ...item,
      dateObject: new Date(`${item.date}T00:00:00.000Z`),
    }));

    if (!days.length) return [];

    // Pad the beginning to align Sunday with the first column.
    const firstDay = days[0].dateObject.getUTCDay();

    const paddedDays = [
      ...Array(firstDay).fill(null),
      ...days,
    ];

    const result = [];

    for (let i = 0; i < paddedDays.length; i += 7) {
      result.push(paddedDays.slice(i, i + 7));
    }

    return result;
  }, [activity]);

  const monthLabels = useMemo(() => {
    if (!activity?.dailyActivity) return [];

    const labels = [];

    activity.dailyActivity.forEach((item, index) => {
      const date = new Date(`${item.date}T00:00:00.000Z`);

      if (
        date.getUTCDate() <= 7 &&
        (index === 0 ||
          date.getUTCMonth() !==
            new Date(
              `${activity.dailyActivity[index - 1].date}T00:00:00.000Z`
            ).getUTCMonth())
      ) {
        labels.push({
          month: date.toLocaleString("en-US", {
            month: "short",
            timeZone: "UTC",
          }),
          week: Math.floor((index + new Date(
            `${activity.startDate}T00:00:00.000Z`
          ).getUTCDay()) / 7),
        });
      }
    });

    return labels;
  }, [activity]);

  if (loading) {
    return (
      <section className="activity-card">
        <p className="activity-state">Loading coding activity...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="activity-card">
        <p className="activity-error">{error}</p>
      </section>
    );
  }

  if (!activity) return null;

  return (
    <section className="activity-card">
      <div className="activity-header">
        <div>
          <span className="activity-eyebrow">
            YOUR CODING JOURNEY
          </span>
          <h2>Activity overview</h2>
          <p>Every submission counts. Keep your momentum going.</p>
        </div>

        <div className="activity-icon">
          <CalendarDays size={23} />
        </div>
      </div>

      <div className="activity-stats">
        <div className="activity-stat">
          <div className="activity-stat-icon streak-icon">
            <Flame size={19} />
          </div>
          <div>
            <span>Current streak</span>
            <strong>{activity.currentStreak} days</strong>
          </div>
        </div>

        <div className="activity-stat">
          <div className="activity-stat-icon trophy-icon">
            <Trophy size={19} />
          </div>
          <div>
            <span>Longest streak</span>
            <strong>{activity.longestStreak} days</strong>
          </div>
        </div>

        <div className="activity-stat">
          <div className="activity-stat-icon calendar-icon">
            <CalendarDays size={19} />
          </div>
          <div>
            <span>Active days</span>
            <strong>{activity.totalActiveDays}</strong>
          </div>
        </div>

        <div className="activity-stat">
          <div className="activity-stat-icon code-icon">
            <Code2 size={19} />
          </div>
          <div>
            <span>Total submissions</span>
            <strong>{activity.totalSubmissions}</strong>
          </div>
        </div>
      </div>

      <div className="activity-calendar-heading">
        <h3>Submission activity</h3>
        <span>Last 365 days</span>
      </div>

      <div className="activity-calendar-scroll">
        <div className="activity-months">
          {monthLabels.map((item, index) => (
            <span
              key={`${item.month}-${index}`}
              style={{
                gridColumn: item.week + 1,
              }}
            >
              {item.month}
            </span>
          ))}
        </div>

        <div className="activity-calendar">
          <div className="activity-weekdays">
            {["", "Mon", "", "Wed", "", "Fri", ""].map(
              (day, index) => (
                <span key={index}>{day}</span>
              )
            )}
          </div>

          <div className="activity-weeks">
            {weeks.map((week, weekIndex) => (
              <div className="activity-week" key={weekIndex}>
                {week.map((day, dayIndex) => (
                  <div
                    key={day?.date || `empty-${dayIndex}`}
                    className={`activity-cell ${
                      day
                        ? getActivityLevel(day.count)
                        : "activity-empty"
                    }`}
                    title={
                      day
                        ? `${day.count} submissions on ${day.date}`
                        : ""
                    }
                    aria-label={
                      day
                        ? `${day.count} submissions on ${day.date}`
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="activity-legend">
        <span>Less</span>
        {["level-0", "level-1", "level-2", "level-3", "level-4"].map(
          (level) => (
            <span
              key={level}
              className={`activity-cell ${level}`}
            />
          )
        )}
        <span>More</span>
      </div>
    </section>
  );
}
