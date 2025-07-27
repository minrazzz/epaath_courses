import usePage from "@/hooks/usePage";
import VirtualScreenRenderer from "@/shared/components/VirtualScreenRenderer";
import { useState } from "react";

const PageView = () => {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);

  const handleScreenComplete = (completedIndex) => {
    setCurrentScreenIndex((prev) => prev + 1); // or your custom logic
  };
  const { TemplateComponent, page } = usePage({
    courseId: "introduction-to-placeholder-xxxxxx",
    lessonId: "introduction-to-placeholder-xxxxxx",
    pageId: "page-1",
  });

  return (
    <div>
      {TemplateComponent && page?.screens ? (
        <TemplateComponent>
          <VirtualScreenRenderer
            currentScreenIndex={currentScreenIndex}
            onScreenComplete={handleScreenComplete}
            screens={page?.screens || []}
          />
        </TemplateComponent>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default PageView;
