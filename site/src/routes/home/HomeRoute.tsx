import type { ReactNode } from "react";
import { JsonDocumentWordmark } from "../../shared/ui/brand";
import { ActionLink } from "../../shared/ui/interactive";
import { homeRecipe } from "./home-styles";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const homeStyles = homeRecipe();

function sitePath(path: string): string {
  return `${BASE_PATH}${path}` || "/";
}

interface HomeSceneProps {
  children: ReactNode;
  cat: string;
  catAlt: string;
  id: string;
  number: string;
}

function HomeScene({ children, cat, catAlt, id, number }: HomeSceneProps) {
  return (
    <section className={homeStyles.scene()} data-home-scene={id} aria-labelledby={`${id}-title`}>
      <div className={homeStyles.sceneCopy()}>
        <span className={homeStyles.sceneNumber()} aria-hidden="true">{number}</span>
        {children}
      </div>
      <figure className={homeStyles.sceneArtwork()}>
        <img className={homeStyles.sceneCat()} src={sitePath(cat)} alt={catAlt} width="512" height="512" loading="lazy" />
      </figure>
    </section>
  );
}

export function HomeRoute() {
  return (
    <main className={homeStyles.page()}>
      <section className={homeStyles.hero()} data-home-scene="hero" aria-labelledby="home-title">
        <div className={homeStyles.heroCopy()}>
          <h1 id="home-title" className={homeStyles.logoHeading()}>
            <span className="sr-only">json-document</span>
            <JsonDocumentWordmark className={homeStyles.logo()} />
          </h1>
          <p className={homeStyles.statement()}>Agent-native artifact editing의 개발 정본.</p>
          <p className={homeStyles.description()}>
            제품을 먼저 만들고, 그 안에서 발견한 책임을 모듈과 부품으로 되돌립니다.
          </p>
          <div className={homeStyles.actions()}>
            <ActionLink to="/docs" kind="prominent">Introduce부터 읽기</ActionLink>
            <ActionLink to="/applications">Applications 보기</ActionLink>
          </div>
          <a className={homeStyles.scrollCue()} href="#foundation-title">이야기를 따라 내려가기</a>
        </div>
        <figure className={homeStyles.heroArtwork()}>
          <img className={homeStyles.heroCat()} src={sitePath("/cat-enter.png")} alt="A small cat struggling to press an oversized Enter key." width="1200" height="800" />
        </figure>
      </section>

      <HomeScene id="foundation" number="01" cat="/illustrations/petite-cats/braces.png" catAlt="A small cat sitting beside a pair of braces.">
        <p className={homeStyles.eyebrow()}>Foundation</p>
        <h2 id="foundation-title" className={homeStyles.sceneTitle()}>모든 편집은 같은 값에서 시작합니다.</h2>
        <p className={homeStyles.sceneDescription()}>
          JSON 값, 의미, 변경, 협업의 계약을 먼저 공유하면 사람과 agent가 같은 문서를 안전하게 다룰 수 있습니다.
        </p>
        <div className={homeStyles.actions()}>
          <ActionLink to="/docs/foundation" kind="prominent">Foundation 살펴보기</ActionLink>
          <ActionLink to="/docs/concepts">Concept Map</ActionLink>
        </div>
      </HomeScene>

      <HomeScene id="hands-artifact" number="02" cat="/illustrations/petite-cats/cursor.png" catAlt="A small cat following a cursor.">
        <p className={homeStyles.eyebrow()}>Hands &amp; Artifact</p>
        <h2 id="hands-artifact-title" className={homeStyles.sceneTitle()}>Hands가 Artifact를 만지고 편집합니다.</h2>
        <p className={homeStyles.sceneDescription()}>
          Hands는 사람과 agent의 편집 도구입니다. Artifact는 내비게이션 없는 앱의 콘텐츠이며, 문서·프레젠테이션·스프레드시트로 이어집니다.
        </p>
        <div className={homeStyles.actions()}>
          <ActionLink to="/editors" kind="prominent">Hands 보기</ActionLink>
          <ActionLink to="/viewer">Artifact 보기</ActionLink>
        </div>
      </HomeScene>

      <HomeScene id="applications" number="03" cat="/illustrations/petite-cats/database.png" catAlt="A small cat peeking around a database.">
        <p className={homeStyles.eyebrow()}>Applications</p>
        <h2 id="applications-title" className={homeStyles.sceneTitle()}>제품에서 책임을 발견합니다.</h2>
        <p className={homeStyles.sceneDescription()}>
          Calendar와 AI Agent 같은 앱은 실제 작업 흐름을 완성하는 제품입니다. 여기서 검증된 책임만 canonical module로 돌아갑니다.
        </p>
        <div className={homeStyles.actions()}>
          <ActionLink to="/applications" kind="prominent">Applications 보기</ActionLink>
          <ActionLink to="/applications/calendar">Calendar</ActionLink>
          <ActionLink to="/applications/ai-agent">AI Agent</ActionLink>
        </div>
      </HomeScene>

      <HomeScene id="how-we-build" number="04" cat="/illustrations/petite-cats/branch.png" catAlt="A small cat walking along a branching path.">
        <p className={homeStyles.eyebrow()}>How We Build</p>
        <h2 id="how-we-build-title" className={homeStyles.sceneTitle()}>제품에서 시작해 생태계로 돌아갑니다.</h2>
        <p className={homeStyles.sceneDescription()}>
          구현보다 먼저 Why와 경계를 공유하고, 제품에서 발견한 같은 역할과 같은 책임을 하나의 정본 모듈로 만듭니다.
        </p>
        <div className={homeStyles.actions()}>
          <ActionLink to="/docs/how-we-build" kind="prominent">만드는 방식 읽기</ActionLink>
          <ActionLink to="/docs">처음부터 다시 보기</ActionLink>
        </div>
      </HomeScene>
    </main>
  );
}
