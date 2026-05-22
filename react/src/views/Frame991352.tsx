import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991352.css";
const Frame991352 = () => {
    const navigate = useNavigate();

    const click_99_1352 = () => {
        navigate(getPathByGuid("94:1786"), {
            state: {
                from: "99:1352",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div
                id="99_1352"
                className="Pixso-frame-99_1352"
                onClick={withStopPropagation(click_99_1352)}
            >
                <div className="frame-content-99_1352">
                    <div id="99_1353" className="Pixso-vector-99_1353"></div>
                    <div id="99_1355" className="Pixso-frame-99_1355">
                        <p id="99_1356" className="Pixso-paragraph-99_1356">
                            {"MEDIA"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Frame991352;
