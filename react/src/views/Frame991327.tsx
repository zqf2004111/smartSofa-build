import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991327.css";
const Frame991327 = () => {
    const navigate = useNavigate();

    const click_99_1327 = () => {
        navigate(getPathByGuid("94:1786"), {
            state: {
                from: "99:1327",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div
                id="99_1327"
                className="Pixso-frame-99_1327"
                onClick={withStopPropagation(click_99_1327)}
            >
                <div className="frame-content-99_1327">
                    <div id="99_1328" className="Pixso-vector-99_1328"></div>
                    <div id="99_1330" className="Pixso-frame-99_1330">
                        <p id="99_1331" className="Pixso-paragraph-99_1331">
                            {"MEDIA"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Frame991327;
