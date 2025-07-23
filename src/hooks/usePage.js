import { useCallback } from "react";

const usePage = ({
  courseId = "introduction-to-placeholder-xxxxxx",
  lessonId = "introduction-to-placeholder-xxxxxx",
  pageId = "page-1",
}) => {
  const loadPage = useCallback(async () => {
    try {
      const course = (await import(`../courses/${courseId}/testjson.json`))
        .default;
      if (!course) {
        throw new Error(`Course with id ${courseId} not found`);
      }
      const lesson = course.lessons.find((lesson) => lesson?.id === lessonId);
      if (!lesson) {
        throw new Error(`Lesson with id ${lessonId} not found`);
      }
      const page = lesson.pages.find((page) => page?.id === pageId);
      if (!page) {
        throw new Error(`Page with id ${pageId} not found`);
      }
      return page;
    } catch (error) {
      console.log("Error loading page:", error);
    }
  }, [pageId, courseId, lessonId]);

  const loadTemplate = useCallback(async () => {
    try {
      const page = await loadPage();
      const templateComponentId = page?.templateId
      const templateComponentPath = 
    } catch (error) {
      console.log("error while loading template", error);
    }
  }, []);

  return {};
};

export default usePage;
