import { ActionLink } from "../../shared/ui/interactive";
import { JsonDocumentWordmark } from "../../shared/ui/brand";
import { homeRecipe } from "./home-styles";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const homeStyles = homeRecipe();

function sitePath(path: string): string {
  return `${BASE_PATH}${path}` || "/";
}

export function HomeRoute() {
  return (
    <main className={homeStyles.page()}>
      <section className={homeStyles.hero()} aria-labelledby="home-title">
        <div className={homeStyles.copy()}>
          <h1 id="home-title" className={homeStyles.logoHeading()}>
            <span className="sr-only">json-document</span>
            <JsonDocumentWordmark className={homeStyles.logo()} />
          </h1>
          <p className={homeStyles.statement()}>
            Agent-native artifact editing의 개발 정본.
          </p>
          <p className={homeStyles.description()}>
            구현보다 먼저 공유해야 할 Why, 계층의 의존 순서, public contract와
            TBD를 한곳에서 관리합니다.
          </p>

          <div className={homeStyles.entry()}>
            <ActionLink to="/docs" kind="prominent">JSON Document부터 읽기</ActionLink>
            <ActionLink to="/viewer">Artifact prototype 보기</ActionLink>
          </div>

          <nav className={homeStyles.index()} aria-label="Dependency map">
            <ol className={homeStyles.indexList()}>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>01</span>
                <span><ActionLink to="/docs" className={homeStyles.indexLink()}>JSON Document</ActionLink>
                <span className={homeStyles.indexBlurb()}>JSON 값·선택·변경·협업의 기반 계약</span></span>
              </li>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>02</span>
                <span><ActionLink to="/editors" className={homeStyles.indexLink()}>Hands</ActionLink>
                <span className={homeStyles.indexBlurb()}>Core 위에서 사람이 artifact와 agent를 다루는 편집 도구</span></span>
              </li>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>03</span>
                <span><ActionLink to="/viewer" className={homeStyles.indexLink()}>Artifact</ActionLink>
                <span className={homeStyles.indexBlurb()}>아래 계층을 조합한 MD·PPT·Sheet prototype · TBD</span></span>
              </li>
            </ol>
          </nav>
        </div>
        <figure className={homeStyles.artwork()}>
          <img
            className={homeStyles.artworkImage()}
            src={sitePath("/cat-enter.png")}
            alt="A small cat struggling to press an oversized Enter key."
            width="1200"
            height="800"
          />
        </figure>
      </section>
    </main>
  );
}
