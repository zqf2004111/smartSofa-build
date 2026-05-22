import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991322.css";
const Frame991322 = () => {
    const navigate = useNavigate();

    const click_99_1322 = () => {
        navigate(getPathByGuid("94:1"), {
            state: {
                from: "99:1322",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div
                id="99_1322"
                className="Pixso-frame-99_1322"
                onClick={withStopPropagation(click_99_1322)}
            >
                <div id="99_1323" className="Pixso-vector-99_1323"></div>
                <div id="99_1325" className="Pixso-frame-99_1325">
                    <p id="99_1326" className="Pixso-paragraph-99_1326">
                        {"HOME"}
                    </p>
                </div>
            </div>
        </div>
    );
};
export default Frame991322;
