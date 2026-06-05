export function TemperatureAreaSection({ parts }) {
    return (<section className="TemperatureAreaSection TemperatureAreaSection__section-1 min-h-0 overflow-hidden">
      <div className="TemperatureAreaSection TemperatureAreaSection__container-1 TemperatureAreaSectionInner min-h-0 overflow-hidden" aria-label="영역별 온도">
        <h2 className="TemperatureAreaSection TemperatureAreaSection__title-1 mb-1 truncate text-xs font-semibold text-foreground">영역별 온도</h2>
        <div className="TemperatureAreaSection TemperatureAreaSection__container-2 grid min-h-0 gap-1">
          {parts.map((area) => (<div key={area.id} className="TemperatureAreaSection TemperatureAreaSection__container-3 grid h-10 min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_5.75rem] items-center gap-1 rounded-md border border-border bg-background px-2" title={`${area.id} ${area.name} 평균 ${area.average} 최고 ${area.max} 최저 ${area.min}`}>
              <span className="TemperatureAreaSection TemperatureAreaSection__label-1 truncate text-xs font-semibold text-foreground">{area.id}</span>
              <div className="TemperatureAreaSection TemperatureAreaSection__container-4 min-w-0">
                <p className="TemperatureAreaSection TemperatureAreaSection__text-1 truncate text-xs font-medium text-foreground">{area.name}</p>
              </div>
            </div>))}
        </div>
      </div>
    </section>);
}
