import { describe, expect, it } from "vitest";
import { createQuestionSnapshot, toPublicQuestion } from "@/domain/learning/snapshot";
import { testQuestion } from "../../helpers/fixtures";

describe("snapshots de question", () => {
  it("conserve les médias des réponses", () => {
    const question = testQuestion({
      id: "ch01-q001",
      options: [
        { id: "a", label: "Panneau A", mediaId: "media-panneau-a" },
        { id: "b", label: "Panneau B" },
      ],
    });

    const snapshot = createQuestionSnapshot(question);

    expect(snapshot.options[0]?.mediaId).toBe("media-panneau-a");
    expect(snapshot.options[1]?.mediaId).toBeUndefined();
  });

  it("expose un média nul pour une réponse non illustrée", () => {
    const publicQuestion = toPublicQuestion(
      createQuestionSnapshot(testQuestion({ id: "ch01-q001" })),
    );

    expect(publicQuestion.options.map((option) => option.mediaId)).toEqual([null, null, null]);
    expect(publicQuestion.mediaId).toBeNull();
  });
});
