import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991347.css";
const Frame991347 = () => {
    const navigate = useNavigate();

    const click_99_1347 = () => {
        navigate(getPathByGuid("94:1"), {
            state: {
                from: "99:1347",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div
                id="99_1347"
                className="Pixso-frame-99_1347"
                onClick={withStopPropagation(click_99_1347)}
            >
                <div id="99_1350" className="Pixso-frame-99_1350">
                    <p id="99_1351" className="Pixso-paragraph-99_1351">
                        {"HOME"}
                    </p>
                </div>
                <div id="99_1348" className="Pixso-vector-99_1348"></div>
            </div>
        </div>
    );
};
export default Frame991347;
