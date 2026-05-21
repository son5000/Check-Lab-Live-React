"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Factory, Lock, User, Zap, TrendingUp, Shield, Moon, Sun, } from "lucide-react";
import { CHECKLAB_AUTH_COOKIE_NAME, CHECKLAB_AUTH_STORAGE_KEY, CHECKLAB_SAMPLE_CREDENTIALS, CHECKLAB_SAMPLE_TOKEN, } from "./session";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
export function LoginPanel({ redirectTo = "/" }) {
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const cn = (dark, light) => (isDarkMode ? dark : light);
    const handleSubmit = (event) => {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);
        const isValidCredential = userId.trim() === CHECKLAB_SAMPLE_CREDENTIALS.id &&
            password === CHECKLAB_SAMPLE_CREDENTIALS.password;
        if (!isValidCredential) {
            setIsSubmitting(false);
            setErrorMessage("아이디 또는 비밀번호를 확인해 주세요.");
            return;
        }
        const sessionPayload = {
            id: CHECKLAB_SAMPLE_CREDENTIALS.id,
            issuedAt: new Date().toISOString(),
            token: CHECKLAB_SAMPLE_TOKEN,
        };
        window.localStorage.setItem(CHECKLAB_AUTH_STORAGE_KEY, JSON.stringify(sessionPayload));
        document.cookie = `${CHECKLAB_AUTH_COOKIE_NAME}=${CHECKLAB_SAMPLE_TOKEN}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
        router.replace(redirectTo);
        router.refresh();
    };
    return (<main className={`LoginPanel LoginPanel__root-1 grid min-h-screen overflow-auto transition-colors duration-300 ${cn("bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white", "bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-950")}`}>
      <section className="LoginPanel LoginPanel__section-1 grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]">
        {/* 사이드바 - 서비스 소개 */}
        <div className={`LoginPanel LoginPanel__visual-1 relative hidden min-h-0 overflow-hidden lg:flex ${cn("bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900", "bg-gradient-to-br from-blue-50 via-cyan-50 to-emerald-50")}`}>
          <div className={`absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--foreground))_1px,transparent_1px)] [background-size:40px_40px] ${cn("opacity-20", "opacity-5")}`}/>
          <div className={`absolute inset-0 transition-colors duration-300 ${cn("bg-gradient-to-t from-black/40 via-transparent to-transparent", "bg-gradient-to-t from-white/20 via-transparent to-transparent")}`}/>

          <div className="LoginPanel LoginPanel__visual-content-1 relative z-10 flex w-full flex-col justify-between p-10 xl:p-12" style={{
            backgroundImage: "url(/images/facility_example.png)",
            backgroundSize: "cover",
            backgroundPosition: "center right",
            backgroundAttachment: "fixed",
        }}>
            <div className="absolute inset-0 rounded-none" style={{
            background: isDarkMode
                ? "radial-gradient(ellipse at bottom right, rgba(0,0,0,0.3), rgba(0,0,0,0.6))"
                : "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4), rgba(255,255,255,0.7))",
            pointerEvents: "none",
        }}/>
            <div className="LoginPanel LoginPanel__visual-fade-1 absolute inset-y-0 right-0 z-0 w-[58%] backdrop-blur-[2px]" style={{
            background: isDarkMode
                ? "linear-gradient(90deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.64) 58%, #0f172a 100%)"
                : "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 56%, #ffffff 100%)",
            maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 36%, #000 72%)",
            pointerEvents: "none",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 36%, #000 72%)",
        }}/>

            {/* 브랜드 */}
            <div className="LoginPanel LoginPanel__brand-1 relative z-10 flex items-center gap-4">
              <div className="LoginPanel LoginPanel__brand-icon-1 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 text-slate-950 shadow-lg shadow-blue-500/20">
                <Factory className="LoginPanel LoginPanel__icon-1 h-6 w-6" aria-hidden="true"/>
              </div>
              <div className="LoginPanel LoginPanel__brand-copy-1 min-w-0">
                <p className={`LoginPanel LoginPanel__product-1 text-lg font-bold tracking-tight ${cn("text-white", "text-slate-950")}`}>
                  CheckLabLive
                </p>
                <p className={`LoginPanel LoginPanel__subtitle-1 text-sm ${cn("text-slate-400", "text-slate-600")}`}>
                  실시간 설비 모니터링 플랫폼
                </p>
              </div>
            </div>

            {/* 히어로 콘텐츠 */}
            <div className="LoginPanel LoginPanel__hero-content-1 relative z-10 space-y-8">
              <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm transition-colors duration-300 ${cn("border border-blue-500/30 bg-blue-500/10 px-4 py-1.5", "border border-blue-300/40 bg-blue-100/30 px-4 py-1.5")}`}>
                  <span className="h-2 w-2 rounded-full bg-blue-400"/>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${cn("text-blue-300", "text-blue-700")}`}>
                    신세대 모니터링
                  </span>
                </div>
                <h2 className={`text-5xl font-light leading-tight ${cn("text-white", "text-slate-950")}`}>
                  설비의 모든 것을
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    한눈에 파악하세요
                  </span>
                </h2>
                <p className={`text-lg ${cn("text-slate-300", "text-slate-700")}`}>
                  실시간 분석으로 설비 상태를 예측하고, 문제를 사전에
                  방지하세요.
                </p>
              </div>

              {/* 기능 카드 */}
              <div className="grid gap-3">
                <FeatureCard icon={Zap} number="1" title="통합 설비 관리" description="Site, Location, Asset을 하나의 체계로 연결해 설비 정보를 구조적으로 관리하고, 복잡한 현장 구성도 한눈에 파악할 수 있습니다." hoverBorder="hover:border-blue-500/30" iconBg={cn("bg-blue-500/20", "bg-blue-100/30")} iconText={cn("text-blue-300", "text-blue-600")} hoverIconBg={cn("group-hover:bg-blue-500/30", "group-hover:bg-blue-100/50")} isDarkMode={isDarkMode}/>
                <FeatureCard icon={TrendingUp} number="2" title="3D 기반 설비 관찰 및 분석" description="3D 오브젝트를 생성하여 설비를 더욱 직관적으로 확인할 수 있으며, 다양한 각도에서 면밀하게 관찰하고 분석할 수 있습니다." hoverBorder="hover:border-cyan-500/30" iconBg={cn("bg-cyan-500/20", "bg-cyan-100/30")} iconText={cn("text-cyan-300", "text-cyan-600")} hoverIconBg={cn("group-hover:bg-cyan-500/30", "group-hover:bg-cyan-100/50")} isDarkMode={isDarkMode}/>
                <FeatureCard icon={Shield} number="3" title="실시간 모니터링과 신속한 대응" description="센서 데이터와 경고 알림을 기반으로 설비 상태를 실시간으로 모니터링하고, 이상 상황 발생 시 빠르게 대응하며 이력을 체계적으로 관리할 수 있습니다." hoverBorder="hover:border-emerald-500/30" iconBg={cn("bg-emerald-500/20", "bg-emerald-100/30")} iconText={cn("text-emerald-300", "text-emerald-600")} hoverIconBg={cn("group-hover:bg-emerald-500/30", "group-hover:bg-emerald-100/50")} isDarkMode={isDarkMode}/>
              </div>
            </div>
          </div>
        </div>

        {/* 로그인 폼 */}
        <div className={`LoginPanel LoginPanel__form-shell-1 relative flex min-h-screen items-center justify-center px-6 py-8 sm:px-8 lg:px-10 transition-colors duration-300 ${cn("bg-slate-900", "bg-white")}`}>
          {/* 테마 토글 버튼 */}
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`absolute top-6 right-6 p-2.5 rounded-lg transition-all duration-300 ${cn("bg-slate-800 text-yellow-400 hover:bg-slate-700", "bg-slate-100 text-slate-600 hover:bg-slate-200")}`} aria-label="테마 전환">
            {isDarkMode ? (<Sun className="h-5 w-5"/>) : (<Moon className="h-5 w-5"/>)}
          </button>

          <form className={`LoginPanel LoginPanel__form-1 w-full max-w-md rounded-lg transition-all duration-300 ${cn("bg-slate-800/60 backdrop-blur-sm", "bg-white border border-slate-200")} p-8`} onSubmit={handleSubmit}>
            {/* 모바일 브랜드 */}
            <div className="LoginPanel LoginPanel__mobile-brand-1 mb-8 flex items-center gap-3 lg:hidden">
              <div className="LoginPanel LoginPanel__mobile-brand-icon-1 grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 text-slate-950 shadow-lg shadow-blue-500/20">
                <Factory className="LoginPanel LoginPanel__icon-2 h-5 w-5" aria-hidden="true"/>
              </div>
              <div className="LoginPanel LoginPanel__mobile-copy-1 min-w-0">
                <p className={`LoginPanel LoginPanel__mobile-product-1 text-base font-bold ${cn("text-white", "text-slate-950")}`}>
                  CheckLabLive
                </p>
                <p className={`LoginPanel LoginPanel__mobile-subtitle-1 text-xs ${cn("text-slate-400", "text-slate-600")}`}>
                  실시간 설비 모니터링
                </p>
              </div>
            </div>

            {/* 제목 */}
            <div className="LoginPanel LoginPanel__heading-1 mb-8">
              <h1 className={`LoginPanel LoginPanel__title-1 text-3xl font-light tracking-tight mb-3 ${cn("text-white", "text-slate-950")}`}>
                로그인
              </h1>
              <p className={`LoginPanel LoginPanel__description-1 text-sm leading-relaxed ${cn("text-slate-400", "text-slate-600")}`}>
                설비의 상태, 알림, 분석 데이터를 실시간으로 모니터링하세요.
              </p>
            </div>

            {/* 입력 필드 */}
            <div className="LoginPanel LoginPanel__fields-1 grid gap-4">
              <label className={`LoginPanel LoginPanel__field-1 grid gap-2 text-sm font-medium ${cn("text-white", "text-slate-950")}`}>
                <span>아이디</span>
                <span className={`LoginPanel LoginPanel__input-shell-1 flex h-11 items-center gap-3 rounded-lg transition-all duration-200 ${cn("border border-slate-700 bg-slate-700/40 focus-within:border-blue-400/50 focus-within:bg-slate-700/70 text-slate-400", "border border-slate-300 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white text-slate-600")} px-4`}>
                  <User className={`LoginPanel LoginPanel__field-icon-1 h-4 w-4 shrink-0 ${cn("text-slate-500", "text-slate-400")}`} aria-hidden="true"/>
                  <input className={`LoginPanel LoginPanel__input-1 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 ${cn("text-white", "text-slate-950")}`} autoComplete="username" onChange={(event) => setUserId(event.target.value)} placeholder="username" value={userId}/>
                </span>
              </label>

              <label className={`LoginPanel LoginPanel__field-2 grid gap-2 text-sm font-medium ${cn("text-white", "text-slate-950")}`}>
                <span>비밀번호</span>
                <span className={`LoginPanel LoginPanel__input-shell-2 flex h-11 items-center gap-3 rounded-lg transition-all duration-200 ${cn("border border-slate-700 bg-slate-700/40 focus-within:border-blue-400/50 focus-within:bg-slate-700/70 text-slate-400", "border border-slate-300 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white text-slate-600")} px-4`}>
                  <Lock className={`LoginPanel LoginPanel__field-icon-2 h-4 w-4 shrink-0 ${cn("text-slate-500", "text-slate-400")}`} aria-hidden="true"/>
                  <input className={`LoginPanel LoginPanel__input-2 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 ${cn("text-white", "text-slate-950")}`} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" type="password" value={password}/>
                </span>
              </label>
            </div>

            {/* 에러 메시지 */}
            {errorMessage ? (<div className={`LoginPanel LoginPanel__error-1 mt-4 rounded-lg border backdrop-blur-sm px-4 py-3 text-sm transition-colors duration-300 ${cn("border-red-500/30 bg-red-500/10 text-red-400", "border-red-300/50 bg-red-50/50 text-red-700")}`}>
                {errorMessage}
              </div>) : null}

            {/* 로그인 버튼 */}
            <button className={`LoginPanel LoginPanel__submit-1 mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:cursor-wait disabled:opacity-60 ${cn("bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-600 hover:to-cyan-600", "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:from-blue-700 hover:to-cyan-700")}`} disabled={isSubmitting} type="submit">
              <CheckCircle2 className="LoginPanel LoginPanel__submit-icon-1 h-4 w-4" aria-hidden="true"/>
              로그인
            </button>
          </form>
        </div>
      </section>
    </main>);
}
function FeatureCard({ icon: Icon, number, title, description, hoverBorder, iconBg, iconText, hoverIconBg, isDarkMode, }) {
    return (<div className={`group flex items-start gap-4 rounded-lg p-4 transition-all duration-300 ${isDarkMode
            ? `border border-slate-700/30 bg-slate-800/20 ${hoverBorder} hover:bg-slate-800/40`
            : `border border-slate-200/50 bg-white/50 ${hoverBorder} hover:bg-slate-50/80`}`}>
      <div className="flex flex-col items-center">
        <div className={`rounded-lg p-2.5 transition-colors ${iconBg} ${hoverIconBg}`}>
          <Icon className={`h-5 w-5 ${iconText}`}/>
        </div>
        <span className={`text-xs font-bold mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          {number}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-950"}`}>
          {title}
        </p>
        <p className={`text-sm mt-2 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          {description}
        </p>
      </div>
    </div>);
}
