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
            <ActionLink to="/docs" kind="prominent">Introduce부터 읽기</ActionLink>
            <ActionLink to="/applications">Applications 보기</ActionLink>
          </div>

          <nav className={homeStyles.index()} aria-label="Dependency map">
            <ol className={homeStyles.indexList()}>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>01</span>
                <span><ActionLink to="/docs" className={homeStyles.indexLink()}>Introduce</ActionLink>
                <span className={homeStyles.indexBlurb()}>왜 만들고 어떤 방식으로 제품에서 모듈을 발견하는가</span></span>
              </li>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>02</span>
                <span><ActionLink to="/docs/foundation" className={homeStyles.indexLink()}>Foundation</ActionLink>
                <span className={homeStyles.indexBlurb()}>값·의미·편집·협업의 기반 계약</span></span>
              </li>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>03</span>
                <span><ActionLink to="/docs/adapters" className={homeStyles.indexLink()}>Building Blocks</ActionLink>
                <span className={homeStyles.indexBlurb()}>플랫폼·생태계·입력·UI를 연결하는 선택 책임</span></span>
              </li>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>04</span>
                <span><ActionLink to="/editors" className={homeStyles.indexLink()}>Hands</ActionLink>
                <span className={homeStyles.indexBlurb()}>사람과 agent가 콘텐츠를 다루는 편집 도구</span></span>
              </li>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>05</span>
                <span><ActionLink to="/viewer" className={homeStyles.indexLink()}>Artifact</ActionLink>
                <span className={homeStyles.indexBlurb()}>Application 안에서 만들고 이어서 편집하는 콘텐츠</span></span>
              </li>
              <li className={homeStyles.indexItem()}>
                <span className={homeStyles.indexNumber()}>06</span>
                <span><ActionLink to="/applications" className={homeStyles.indexLink()}>Applications</ActionLink>
                <span className={homeStyles.indexBlurb()}>제품에서 책임을 발견하고 canonical module로 되돌리는 곳</span></span>
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
