import { templatesRegistry } from "../core/registries/templatesRegistry";
import { useCallback, useEffect, useState } from "react";

const usePage = ({
  courseId = "introduction-to-placeholder-xxxxxx",
  lessonId = "introduction-to-placeholder-xxxxxx",
  pageId = "page-1",
}) => {
  const [TemplateComponent, setTemplateComponent] = useState(null);
  const [page, setPage] = useState(null);

  const _loadPage = useCallback(async () => {
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

  const _loadTemplate = useCallback(async () => {
    try {
      const page = await _loadPage();
      if (!page) {
        throw new Error(`Page with id ${pageId} not found`);
      }
      setPage(page);
      const templateCategory = page?.category;
      const templateId = page?.templateID;
      const templateImportFunction =
        templatesRegistry?.[`${templateCategory}/${templateId}`];
      if (!templateImportFunction) {
        throw new Error(
          `Template with category ${templateCategory} and id ${templateId} not found`
        );
      }
      const TemplateComponent = await templateImportFunction();
      if (!TemplateComponent) {
        throw new Error(`Template component for ${templateId} not found`);
      }
      setTemplateComponent(
        () => TemplateComponent.default || TemplateComponent
      );
    } catch (error) {
      console.log("error while loading template", error);
    }
  }, [_loadPage, pageId, courseId, lessonId]);

  useEffect(() => {
    _loadTemplate();
  }, [_loadTemplate]);

  return {
    TemplateComponent,
    page,
  };
};
export default usePage;
