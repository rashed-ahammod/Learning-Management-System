import type { Schema, Struct } from '@strapi/strapi';

export interface QuizQuestion extends Struct.ComponentSchema {
  collectionName: 'components_quiz_questions';
  info: {
    description: 'One multiple-choice question. options holds the choices in display order and correctIndex points at the right one, so the answer key travels with the question and has to be stripped before a student ever sees it.';
    displayName: 'Question';
  };
  attributes: {
    correctIndex: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    options: Schema.Attribute.JSON & Schema.Attribute.Required;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'quiz.question': QuizQuestion;
    }
  }
}
