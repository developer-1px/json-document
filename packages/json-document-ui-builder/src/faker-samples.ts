import { Faker, ko, en, base } from "@faker-js/faker";
import type { UIBuilderField, UIBuilderSampleGenerator } from "@interactive-os/json-document-editing";

/** A scoped Korean-first Faker instance; does not mutate global Faker state. */
export function createFakerSampleGenerator(seed?: number): UIBuilderSampleGenerator {
  const faker = new Faker({locale: [ko, en, base]});
  const latin = new Faker({locale: [en, base]});
  if (seed !== undefined) { faker.seed(seed); latin.seed(seed); }
  return (field: UIBuilderField) => {
    if (field.type === "number") return faker.number.int({min: 1, max: /가격|금액|price|amount/i.test(field.name) ? 100000 : 100});
    if (field.type === "checkbox") return faker.datatype.boolean();
    if (field.type === "select") return faker.helpers.arrayElement(field.options).id;
    let kind = field.sample;
    if (kind === "auto") {
      const name = `${field.id} ${field.name}`;
      kind = /메일|email/i.test(name) ? "email" : /회사|company/i.test(name) ? "company" : /상품|제품|product/i.test(name) ? "product" : /날짜|일자|date/i.test(name) ? "date" : /주소|url|링크/i.test(name) ? "url" : /이름|성명|name/i.test(name) ? "name" : "sentence";
    }
    switch (kind) {
      case "name": return faker.person.fullName();
      case "email": return latin.internet.email();
      case "company": return faker.company.name();
      case "product": return faker.commerce.productName();
      case "date": return faker.date.between({from: "2026-01-01T00:00:00Z", to: "2026-12-31T00:00:00Z"}).toISOString().slice(0, 10);
      case "url": return faker.internet.url();
      default: return faker.lorem.sentence(5);
    }
  };
}
