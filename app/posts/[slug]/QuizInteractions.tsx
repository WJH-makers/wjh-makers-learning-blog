"use client";

import { useEffect } from "react";

type QuizOption = { label: string; text: string };

function parseOptions(text: string): QuizOption[] {
  const matches = [...text.matchAll(/(?:^|[\s　])([A-D])\)\s*/g)];
  if (matches.length < 2) return [];

  return matches.map((match, index) => {
    const start = match.index! + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index! : text.length;
    return { label: match[1], text: text.slice(start, end).trim() };
  });
}

function answerKeys(detail: HTMLDetailsElement | null): Map<number, string> {
  const keys = new Map<number, string>();
  detail?.querySelectorAll("p").forEach((paragraph) => {
    const match = paragraph.textContent?.trim().match(/^(\d+)[-－]([A-D])(?:[。.\s]|$)/);
    if (match) keys.set(Number(match[1]), match[2]);
  });
  return keys;
}

/**
 * Markdown 保持可导出、可检索；浏览器端只把标准 A/B/C/D 列表增强成可作答按钮。
 * 无 JavaScript 时原始题目与 <details> 答案仍完整可读。
 */
export default function QuizInteractions() {
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>(".article-content h3")]
      .filter((heading) => /^选择题/.test(heading.textContent?.trim() ?? ""));

    sections.forEach((heading) => {
      const questions = heading.nextElementSibling;
      if (!(questions instanceof HTMLOListElement) || questions.dataset.quizReady === "true") return;

      let next = questions.nextElementSibling;
      while (next && !(next instanceof HTMLDetailsElement)) next = next.nextElementSibling;
      const keys = answerKeys(next instanceof HTMLDetailsElement ? next : null);

      questions.querySelectorAll<HTMLElement>(":scope > li").forEach((question, index) => {
        const optionLine = question.querySelector<HTMLElement>(":scope > ul > li");
        if (!optionLine) return;

        const options = parseOptions(optionLine.textContent ?? "");
        if (options.length < 2) return;

        const box = document.createElement("div");
        box.className = "quiz-options";
        box.setAttribute("role", "group");
        box.setAttribute("aria-label", `第 ${index + 1} 题选项`);
        const feedback = document.createElement("p");
        feedback.className = "quiz-feedback";
        feedback.setAttribute("aria-live", "polite");
        const correct = keys.get(index + 1);

        options.forEach((option) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "quiz-option";
          button.dataset.choice = option.label;
          button.setAttribute("aria-pressed", "false");
          button.textContent = `${option.label}. ${option.text}`;
          button.addEventListener("click", () => {
            box.querySelectorAll<HTMLButtonElement>(".quiz-option").forEach((candidate) => {
              candidate.classList.remove("is-selected", "is-correct", "is-wrong");
              candidate.setAttribute("aria-pressed", String(candidate === button));
            });
            button.classList.add("is-selected");

            if (!correct) {
              feedback.textContent = "已选择。展开下方“查看答案与解析”核对。";
              return;
            }
            const isCorrect = option.label === correct;
            button.classList.add(isCorrect ? "is-correct" : "is-wrong");
            feedback.textContent = isCorrect
              ? "回答正确。可展开下方答案查看解析。"
              : `这题选 ${correct}。展开下方答案查看解析。`;
          });
          box.appendChild(button);
        });

        optionLine.parentElement?.replaceWith(box);
        question.appendChild(feedback);
        question.classList.add("interactive-quiz-question");
      });
      questions.dataset.quizReady = "true";
    });
  }, []);

  return null;
}
