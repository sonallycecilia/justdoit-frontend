import Sidebar from '../components/Sidebar';
import WeeklyCalendar from '../components/Calendar/WeeklyCalendar';

export default function Calendario() {
  return (
    <div className="app">
      <Sidebar ativa="calendar" />
      {/* overflow hidden: o scroll fica dentro da grade (.cal-scroll), não na página */}
      <main className="app__main" style={{ overflow: 'hidden' }}>
        <WeeklyCalendar />
      </main>
    </div>
  );
}
